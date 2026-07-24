<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Formation;
use App\Models\PlanFormation;
use App\Models\SessionFormation;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class ReportController extends Controller
{
    private function scopedSessions(Request $request)
    {
        $query = SessionFormation::with([
            'formation.theme',
            'animateur',
            'lignePlanFormation.planFormation.responsableCdc',
            'lignePlanFormation.planFormation.validatedBy',
            'participations.evaluation',
            'absences',
            'documents',
            'hebergements',
        ]);

        $user = $request->user();
        if ($user->role === 'responsable_cdc') {
            $query->whereHas('lignePlanFormation.planFormation', fn($q) => $q->where('responsable_cdc_id', $user->id));
        }
        if ($user->role === 'formateur_animateur') {
            $query->where('animateur_id', $user->id);
        }
        if ($user->role === 'responsable_dr') {
            $query->where('region', $user->region);
        }

        return $query;
    }

    private function validateFilters(Request $request): array
    {
        $data = Validator::make($request->all(), [
            'plan_id' => ['nullable','integer','exists:plans_formation,id'],
            'formation_id' => ['nullable','integer','exists:formations,id'],
            'cdc_id' => ['nullable','integer','exists:users,id'],
            'animateur_id' => ['nullable','integer','exists:users,id'],
            'responsable_formation_id' => ['nullable','integer','exists:users,id'],
            'date_from' => ['nullable','date'],
            'date_to' => ['nullable','date','after_or_equal:date_from'],
            'statut' => ['nullable','in:planifiee,en_cours,terminee,annulee'],
        ])->validate();

        if (!empty($data['plan_id']) && !empty($data['formation_id'])) {
            $belongs = PlanFormation::whereKey($data['plan_id'])
                ->whereHas('lignesPlanFormation', fn($q) => $q->where('formation_id', $data['formation_id']))
                ->exists();
            if (!$belongs) throw ValidationException::withMessages(['formation_id' => 'La formation ne correspond pas au plan selectionne.']);
        }

        return $data;
    }

    public function options(Request $request)
    {
        $sessions = $this->scopedSessions($request)->get();
        $planIds = $sessions->pluck('lignePlanFormation.planFormation.id')->filter()->unique()->values();
        $formationIds = $sessions->pluck('formation_id')->filter()->unique()->values();
        $cdcIds = $sessions->pluck('lignePlanFormation.planFormation.responsable_cdc_id')->filter()->unique()->values();
        $animateurIds = $sessions->pluck('animateur_id')->filter()->unique()->values();
        $responsableFormationIds = $sessions->pluck('lignePlanFormation.planFormation.validated_by')->filter()->unique()->values();

        return response()->json([
            'plans' => PlanFormation::whereIn('id',$planIds)->select('id','titre','statut')->orderBy('titre')->get(),
            'formations' => Formation::with('theme')->whereIn('id',$formationIds)->orderBy('titre')->get(),
            'plan_formations' => $sessions->map(fn($s) => ['plan_id'=>$s->lignePlanFormation?->plan_formation_id,'formation_id'=>$s->formation_id])->filter(fn($x)=>$x['plan_id']&&$x['formation_id'])->unique(fn($x)=>$x['plan_id'].'-'.$x['formation_id'])->values(),
            'cdcs' => User::whereIn('id',$cdcIds)->select('id','nom','prenom','email','role')->get(),
            'animateurs' => User::whereIn('id',$animateurIds)->select('id','nom','prenom','email','role')->get(),
            'responsables_formation' => User::whereIn('id',$responsableFormationIds)->select('id','nom','prenom','email','role')->get(),
        ]);
    }

    public function plans(Request $request)
    {
        $filters = $this->validateFilters($request);
        $query = $this->scopedSessions($request);

        $query->when($filters['plan_id'] ?? null, fn($q,$id) => $q->whereHas('lignePlanFormation', fn($qq) => $qq->where('plan_formation_id',$id)));
        $query->when($filters['formation_id'] ?? null, fn($q,$id) => $q->where('formation_id',$id));
        $query->when($filters['cdc_id'] ?? null, fn($q,$id) => $q->whereHas('lignePlanFormation.planFormation', fn($qq) => $qq->where('responsable_cdc_id',$id)));
        $query->when($filters['animateur_id'] ?? null, fn($q,$id) => $q->where('animateur_id',$id));
        $query->when($filters['responsable_formation_id'] ?? null, fn($q,$id) => $q->whereHas('lignePlanFormation.planFormation', fn($qq) => $qq->where('validated_by',$id)));
        $query->when($filters['date_from'] ?? null, fn($q,$date) => $q->whereDate('date_session','>=',$date));
        $query->when($filters['date_to'] ?? null, fn($q,$date) => $q->whereDate('date_session','<=',$date));
        $query->when($filters['statut'] ?? null, fn($q,$statut) => $q->where('statut',$statut));

        $rows = $query->latest('date_session')->get()->map(function(SessionFormation $session) {
            $plan = $session->lignePlanFormation?->planFormation;
            $participants = $session->participations->count();
            $absences = $session->absences->count();
            $evaluations = $session->participations->filter(fn($participation) => (bool) $participation->evaluation)->count();
            $tauxAbsence = $participants > 0 ? round(($absences / $participants) * 100, 2) : 0;
            return [
                'session_id' => $session->id,
                'plan_id' => $plan?->id,
                'plan' => $plan?->titre,
                'annee_plan' => $plan?->annee,
                'statut_plan' => $plan?->statut,
                'periode_plan' => trim((optional($plan?->periode_debut)->toDateString() ?: '').' - '.(optional($plan?->periode_fin)->toDateString() ?: ''), ' -'),
                'formation_id' => $session->formation_id,
                'formation' => $session->formation?->titre,
                'theme' => $session->formation?->theme?->nom,
                'niveau' => $session->formation?->niveau,
                'duree_formation' => $session->formation?->duree,
                'priorite' => $session->lignePlanFormation?->priorite,
                'public_cible' => $session->lignePlanFormation?->public_cible,
                'periode_souhaitee' => $session->lignePlanFormation?->periode_souhaitee,
                'cdc' => $plan?->responsableCdc?->nom_complet,
                'animateur' => $session->animateur?->nom_complet,
                'responsable_formation' => $plan?->validatedBy?->nom_complet,
                'nombre_participants' => $participants,
                'nombre_absences' => $absences,
                'taux_absence' => $tauxAbsence,
                'evaluations' => $evaluations,
                'documents' => $session->documents->count(),
                'hebergements' => $session->hebergements->count(),
                'type_session' => $session->type_session,
                'region' => $session->region,
                'ville' => $session->ville,
                'lieu' => $session->lieu,
                'salle' => $session->salle,
                'plateforme' => $session->plateforme,
                'statut' => $session->statut,
                'date_session' => optional($session->date_session)->toDateString(),
            ];
        });

        return response()->json(['message'=>'Rapport genere avec succes.','data'=>$rows,'filters'=>$filters]);
    }
}
