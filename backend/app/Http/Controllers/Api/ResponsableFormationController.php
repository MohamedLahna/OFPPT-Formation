<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\HebergementRequest;
use App\Http\Requests\ReviewPlanRequest;
use App\Http\Requests\SessionRequest;
use App\Http\Resources\EvaluationResource;
use App\Http\Resources\PlanResource;
use App\Http\Resources\SessionResource;
use App\Models\Evaluation;
use App\Models\Hebergement;
use App\Models\LignePlanFormation;
use App\Models\Participation;
use App\Models\PlanFormation;
use App\Models\SessionFormation;
use App\Models\User;
use App\Services\AuditLogger;
use App\Support\MoroccanRegions;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ResponsableFormationController extends Controller
{
    public function dashboard(){ return response()->json(['plans_a_valider'=>PlanFormation::where('statut','en_attente_validation')->count(),'plans_valides'=>PlanFormation::where('statut','valide')->count(),'sessions_planifiees'=>SessionFormation::where('statut','planifiee')->count(),'sessions_en_cours'=>SessionFormation::where('statut','en_cours')->count(),'sessions_terminees'=>SessionFormation::where('is_finished',true)->count()]); }
    public function plans(Request $request){ $plans=PlanFormation::with(['responsableCdc','besoinsFormation.theme','lignesPlanFormation.formation.theme','documents'])->when($request->statut,fn($q,$s)=>$q->where('statut',$s))->when($request->annee,fn($q,$a)=>$q->where('annee',$a))->latest()->get(); return PlanResource::collection($plans); }
    public function showPlan(PlanFormation $plan){ return new PlanResource($plan->load(['responsableCdc','besoinsFormation.theme','lignesPlanFormation.formation.theme','documents'])); }
    public function validatePlan(Request $request, PlanFormation $plan){ if($plan->statut!=='en_attente_validation') return response()->json(['message'=>'Plan non valide pour cette action.'],422); $plan->update(['statut'=>'valide','validated_by'=>$request->user()->id,'commentaire_validation'=>null]); AuditLogger::record($request,'plan_validated','Plans',"Validation du plan {$plan->titre}.",['plan_id'=>$plan->id,'statut'=>'valide']); return response()->json(['message'=>'Plan valide.','plan'=>(new PlanResource($plan->fresh()))->resolve()]); }
    public function correction(ReviewPlanRequest $request, PlanFormation $plan){ if(!$request->filled('commentaire_validation')) throw ValidationException::withMessages(['commentaire_validation'=>'Le commentaire est requis.']); if($plan->statut!=='en_attente_validation') return response()->json(['message'=>'Plan non valide pour cette action.'],422); $plan->update(['statut'=>'a_corriger','validated_by'=>$request->user()->id,'commentaire_validation'=>$request->commentaire_validation]); return response()->json(['message'=>'Correction demandee.','plan'=>(new PlanResource($plan->fresh()))->resolve()]); }
    public function refuse(ReviewPlanRequest $request, PlanFormation $plan){ if(!$request->filled('commentaire_validation')) throw ValidationException::withMessages(['commentaire_validation'=>'Le commentaire est requis.']); if($plan->statut!=='en_attente_validation') return response()->json(['message'=>'Plan non valide pour cette action.'],422); $plan->update(['statut'=>'refuse','validated_by'=>$request->user()->id,'commentaire_validation'=>$request->commentaire_validation]); AuditLogger::record($request,'plan_refused','Plans',"Refus du plan {$plan->titre}.",['plan_id'=>$plan->id,'statut'=>'refuse']); return response()->json(['message'=>'Plan refuse.','plan'=>(new PlanResource($plan->fresh()))->resolve()]); }
    public function users(){ return \App\Http\Resources\UserResource::collection(\App\Models\User::whereIn('role',['formateur_animateur','formateur_participant'])->get()); }
    public function sessions(){ return SessionResource::collection(SessionFormation::with(['formation.theme','animateur','participations.participant','hebergements.participant'])->latest()->get()); }
    public function showSession(SessionFormation $session){ return new SessionResource($session->load(['formation.theme','animateur','participations.participant','documents','hebergements.participant'])); }
    public function evaluations(Request $request)
    {
        $data = $request->validate([
            'session_id' => ['nullable','exists:sessions_formation,id'],
            'formation_id' => ['nullable','exists:formations,id'],
            'participant_id' => ['nullable','exists:users,id'],
            'note' => ['nullable','integer','between:1,5'],
        ]);

        $evaluations = Evaluation::with([
            'participation.participant',
            'participation.sessionFormation.formation.theme',
            'participation.sessionFormation.animateur',
        ])
            ->when($data['session_id'] ?? null, fn ($query, $sessionId) => $query->whereHas('participation', fn ($q) => $q->where('session_formation_id', $sessionId)))
            ->when($data['formation_id'] ?? null, fn ($query, $formationId) => $query->whereHas('participation.sessionFormation', fn ($q) => $q->where('formation_id', $formationId)))
            ->when($data['participant_id'] ?? null, fn ($query, $participantId) => $query->whereHas('participation', fn ($q) => $q->where('participant_id', $participantId)))
            ->when($data['note'] ?? null, fn ($query, $note) => $query->where('note', $note))
            ->latest('date_evaluation')
            ->latest('id')
            ->get();

        return EvaluationResource::collection($evaluations);
    }
    public function createSession(SessionRequest $request)
    {
        $data=$request->validated(); $ligne=LignePlanFormation::with('planFormation')->findOrFail($data['ligne_plan_formation_id']);
        if($ligne->planFormation->statut!=='valide') return response()->json(['message'=>'La ligne doit appartenir a un plan valide.'],422);
        $animateur=User::findOrFail($data['animateur_id']); if($animateur->role!=='formateur_animateur') throw ValidationException::withMessages(['animateur_id'=>'L animateur doit avoir le role formateur animateur.']);
        $participantIds=collect($data['participants'])->pluck('id'); if($participantIds->duplicates()->isNotEmpty()) throw ValidationException::withMessages(['participants'=>'Participant en double.']);
        $bad=User::whereIn('id',$participantIds)->where('role','!=','formateur_participant')->exists(); if($bad||User::whereIn('id',$participantIds)->count()!==$participantIds->count()) throw ValidationException::withMessages(['participants'=>'Tous les participants doivent etre des formateurs participants.']);
        $session=DB::transaction(function() use($data,$ligne){ $session=SessionFormation::create(['ligne_plan_formation_id'=>$ligne->id,'formation_id'=>$ligne->formation_id,'animateur_id'=>$data['animateur_id'],'date_session'=>$data['date_session'],'type_session'=>$data['type_session'],'ville'=>$data['ville'],'region'=>$data['region'],'lieu'=>$data['lieu']??null,'salle'=>$data['salle']??null,'plateforme'=>$data['plateforme']??null,'lien_visio'=>$data['lien_visio']??null,'statut'=>'planifiee']); foreach($data['participants'] as $p){ $mode=$data['type_session']==='presentielle'?'presentiel':($data['type_session']==='distance'?'distance':$p['mode_participation']); Participation::create(['session_formation_id'=>$session->id,'participant_id'=>$p['id'],'mode_participation'=>$mode,'date_inscription'=>now()->toDateString()]); } return $session; });

        AuditLogger::record(
            $request,
            'session_created',
            'Sessions',
            "Creation de la session {$session->id}.",
            [
                'session_id' => $session->id,
                'formation_id' => $session->formation_id,
                'region' => $session->region,
                'participants_count' => count($data['participants'] ?? []),
            ]
        );

        AuditLogger::record(
            $request,
            'participation_added',
            'Participations',
            "Ajout de participants a la session {$session->id}.",
            [
                'session_id' => $session->id,
                'added_participants' => collect($data['participants'] ?? [])->pluck('id')->values()->all(),
                'count' => count($data['participants'] ?? []),
            ]
        );

        return (new SessionResource($session->load(['formation.theme','animateur','participations.participant'])))->response()->setStatusCode(201);
    }
    public function updateSession(Request $request, SessionFormation $session)
    {
        $data=$request->validate([
            'statut'=>['sometimes','in:planifiee,en_cours,terminee,annulee'],
            'date_session'=>['sometimes','date'],
            'type_session'=>['sometimes',Rule::in(['presentielle','distance','hybride'])],
            'ville'=>['sometimes','string','max:120'],
            'region'=>['sometimes',Rule::in(MoroccanRegions::VALUES)],
            'lieu'=>['nullable','string','max:190'],
            'salle'=>['nullable','string','max:190'],
            'plateforme'=>['nullable','string','max:190'],
            'lien_visio'=>['nullable','string','max:190'],
            'animateur_id'=>['sometimes','exists:users,id'],
            'participants'=>['sometimes','array','min:1'],
            'participants.*.id'=>['required_with:participants','exists:users,id'],
            'participants.*.mode_participation'=>['nullable','in:presentiel,distance'],
        ]);

        $type = $data['type_session'] ?? $session->type_session;
        $values = array_merge($session->only(['lieu','salle','plateforme','lien_visio']), $data);

        if (in_array($type, ['presentielle','hybride'], true) && (empty($values['lieu']) || empty($values['salle']))) {
            throw ValidationException::withMessages(['lieu' => 'Le lieu et la salle sont requis pour ce type de session.']);
        }

        if (in_array($type, ['distance','hybride'], true) && (empty($values['plateforme']) || empty($values['lien_visio']))) {
            throw ValidationException::withMessages(['plateforme' => 'La plateforme et le lien visio sont requis pour ce type de session.']);
        }

        if (isset($data['animateur_id']) && User::whereKey($data['animateur_id'])->where('role','formateur_animateur')->doesntExist()) {
            throw ValidationException::withMessages(['animateur_id' => 'L animateur doit avoir le role formateur animateur.']);
        }

        if (isset($data['participants'])) {
            $participantIds = collect($data['participants'])->pluck('id');
            if ($participantIds->duplicates()->isNotEmpty()) {
                throw ValidationException::withMessages(['participants' => 'Participant en double.']);
            }

            if (User::whereIn('id', $participantIds)->where('role', '!=', 'formateur_participant')->exists() || User::whereIn('id', $participantIds)->count() !== $participantIds->count()) {
                throw ValidationException::withMessages(['participants' => 'Tous les participants doivent etre des formateurs participants.']);
            }

            if ($type === 'hybride') {
                foreach ($data['participants'] as $index => $participant) {
                    if (empty($participant['mode_participation'])) {
                        throw ValidationException::withMessages(["participants.$index.mode_participation" => 'Mode requis pour une session hybride.']);
                    }
                }
            }

            $lockedParticipantIds = $session->participations()
                ->whereNotIn('participant_id', $participantIds)
                ->whereHas('evaluation')
                ->pluck('participant_id');

            if ($lockedParticipantIds->isNotEmpty()) {
                throw ValidationException::withMessages(['participants' => 'Impossible de retirer un participant qui a deja envoye une evaluation.']);
            }
        }

        DB::transaction(function () use ($session, $data, $type) {
            $fields = collect($data)->except('participants')->all();
            if ($type === 'presentielle') {
                $fields['plateforme'] = null;
                $fields['lien_visio'] = null;
            }
            if ($type === 'distance') {
                $fields['lieu'] = null;
                $fields['salle'] = null;
            }

            if (($fields['statut'] ?? $session->statut) === 'terminee') {
                $fields['is_finished'] = true;
                $fields['finished_at'] = $session->finished_at ?: now();
            } elseif (array_key_exists('statut', $fields) && $fields['statut'] !== 'terminee') {
                $fields['is_finished'] = false;
                $fields['finished_at'] = null;
            }

            $session->update($fields);

            if (isset($data['participants'])) {
                $participantIds = collect($data['participants'])->pluck('id')->map(fn($id)=>(int)$id)->all();
                $session->participations()->whereNotIn('participant_id', $participantIds)->delete();

                foreach ($data['participants'] as $participant) {
                    $mode = $type === 'presentielle' ? 'presentiel' : ($type === 'distance' ? 'distance' : $participant['mode_participation']);
                    $session->participations()->updateOrCreate(
                        ['participant_id' => $participant['id']],
                        ['mode_participation' => $mode, 'date_inscription' => now()->toDateString()]
                    );
                }
            }
        });

        return new SessionResource($session->fresh(['formation.theme','animateur','participations.participant']));
    }
    public function addParticipants(Request $request, SessionFormation $session){ $data=$request->validate(['participants'=>['required','array','min:1'],'participants.*.id'=>['required','exists:users,id'],'participants.*.mode_participation'=>['nullable','in:presentiel,distance']]); foreach($data['participants'] as $p){ $user=User::find($p['id']); if($user->role!=='formateur_participant') throw ValidationException::withMessages(['participants'=>'Role participant invalide.']); if($session->participations()->where('participant_id',$p['id'])->exists()) throw ValidationException::withMessages(['participants'=>'Participant deja inscrit.']); $session->participations()->create(['participant_id'=>$p['id'],'mode_participation'=>$p['mode_participation']??null,'date_inscription'=>now()->toDateString()]); } AuditLogger::record($request,'participation_added','Participations',"Ajout de participants a la session {$session->id}.",['session_id'=>$session->id,'added_participants'=>collect($data['participants'])->pluck('id')->values()->all(),'count'=>count($data['participants'])]); return new SessionResource($session->fresh(['participations.participant'])); }
    public function addHebergement(HebergementRequest $request, SessionFormation $session)
    {
        if ($session->type_session === 'distance') {
            return response()->json(['message' => 'Hebergement disponible uniquement pour les sessions presen­tielles ou hybrides.'], 422);
        }

        if (!$session->participations()->where('participant_id', $request->participant_id)->exists()) {
            throw ValidationException::withMessages(['participant_id' => 'Participant non inscrit a cette session.']);
        }

        $data = $request->validated();
        $hebergement = Hebergement::updateOrCreate(
            ['session_formation_id' => $session->id, 'participant_id' => $data['participant_id']],
            $data
        );

        if ($hebergement->wasRecentlyCreated) {
            AuditLogger::record(
                $request,
                'hebergement_created',
                'Hebergements',
                "Creation d hebergement pour la session {$session->id}.",
                [
                    'session_id' => $session->id,
                    'participant_id' => $data['participant_id'],
                ],
                (int) $data['participant_id']
            );
        }

        return response()->json([
            'message' => $hebergement->wasRecentlyCreated ? 'Hebergement ajoute.' : 'Hebergement modifie.',
            'hebergement' => (new \App\Http\Resources\HebergementResource($hebergement->load('participant')))->resolve(),
        ], $hebergement->wasRecentlyCreated ? 201 : 200);
    }
}
