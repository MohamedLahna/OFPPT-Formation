<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AbsenceResource;
use App\Http\Resources\PlanResource;
use App\Http\Resources\SessionResource;
use App\Http\Resources\UserResource;
use App\Models\Absence;
use App\Models\PlanFormation;
use App\Models\SessionFormation;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class DrController extends Controller
{
    private function region(Request $request): ?string
    {
        return $request->user()->region;
    }

    private function regionalSessions(Request $request): Builder
    {
        $query = SessionFormation::query();
        $region = $this->region($request);

        return $region ? $query->where('region', $region) : $query->whereRaw('1 = 0');
    }

    private function regionalPlans(Request $request): Builder
    {
        if (!$this->region($request)) {
            return PlanFormation::query()->whereRaw('1 = 0');
        }

        return PlanFormation::query()
            ->whereHas('lignesPlanFormation.sessionsFormation', fn ($q) => $q->where('region', $this->region($request)));
    }

    private function regionalAbsences(Request $request): Builder
    {
        if (!$this->region($request)) {
            return Absence::query()->whereRaw('1 = 0');
        }

        return Absence::query()
            ->whereHas('sessionFormation', fn ($q) => $q->where('region', $this->region($request)));
    }

    public function dashboard(Request $request)
    {
        $sessions = $this->regionalSessions($request);

        return response()->json([
            'region' => $this->region($request) ?: 'Aucune region affectee',
            'plans_valides' => (clone $this->regionalPlans($request))->where('statut', 'valide')->count(),
            'sessions_planifiees' => (clone $sessions)->where('statut', 'planifiee')->count(),
            'sessions_en_cours' => (clone $sessions)->where('statut', 'en_cours')->count(),
            'nombre_absences' => (clone $this->regionalAbsences($request))->count(),
            'participants' => $this->regionalParticipants($request)->count(),
        ]);
    }

    public function plans(Request $request)
    {
        return PlanResource::collection(
            $this->regionalPlans($request)
                ->with(['responsableCdc', 'lignesPlanFormation.formation.theme', 'lignesPlanFormation.sessionsFormation'])
                ->latest()
                ->get()
        );
    }

    public function showPlan(Request $request, PlanFormation $plan)
    {
        $allowed = (clone $this->regionalPlans($request))
            ->whereKey($plan->id)
            ->exists();

        if (!$allowed) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        return new PlanResource(
            $plan->load([
                'responsableCdc',
                'besoinsFormation.theme',
                'lignesPlanFormation.formation.theme',
                'lignesPlanFormation.sessionsFormation',
                'documents',
            ])
        );
    }

    public function sessions(Request $request)
    {
        return SessionResource::collection(
            $this->regionalSessions($request)
                ->with(['formation.theme', 'animateur', 'participations.participant'])
                ->latest()
                ->get()
        );
    }

    public function showSession(Request $request, SessionFormation $session)
    {
        if ($session->region !== $this->region($request)) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        return new SessionResource(
            $session->load([
                'formation.theme',
                'animateur',
                'participations.participant',
                'documents',
                'absences.participant',
                'hebergements.participant',
            ])
        );
    }

    public function participants(Request $request)
    {
        return UserResource::collection(
            $this->regionalParticipants($request)
                ->orderBy('prenom')
                ->orderBy('nom')
                ->get()
        );
    }

    private function regionalParticipants(Request $request): Builder
    {
        if (!$this->region($request)) {
            return User::query()->whereRaw('1 = 0');
        }

        return User::query()
            ->where('role', 'formateur_participant')
            ->whereHas('participations.sessionFormation', fn ($q) => $q->where('region', $this->region($request)));
    }

    public function absences(Request $request)
    {
        return AbsenceResource::collection(
            $this->regionalAbsences($request)
                ->with(['sessionFormation.formation', 'participant'])
                ->latest('date_absence')
                ->get()
        );
    }

    public function statistiques(Request $request)
    {
        $request->validate([
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
        ]);

        $region = $this->region($request);
        $dateFrom = $request->date('date_from')?->startOfDay() ?: now()->startOfMonth();
        $dateTo = $request->date('date_to')?->startOfDay() ?: now()->startOfDay();

        if ($dateFrom->diffInDays($dateTo) > 90) {
            throw ValidationException::withMessages(['date_to' => 'La periode statistique ne peut pas depasser 90 jours.']);
        }

        $plans = $this->regionalPlans($request)
            ->selectRaw('statut, count(*) as total')
            ->groupBy('statut')
            ->pluck('total', 'statut');

        $sessionsInPeriod = $this->regionalSessions($request)
            ->whereDate('date_session', '<=', $dateTo->toDateString())
            ->whereDate('date_session', '>=', $dateFrom->toDateString());

        $absencesInPeriod = $this->regionalAbsences($request)
            ->whereDate('date_absence', '>=', $dateFrom->toDateString())
            ->whereDate('date_absence', '<=', $dateTo->toDateString());

        $sessions = (clone $sessionsInPeriod)
            ->selectRaw('type_session, count(*) as total')
            ->groupBy('type_session')
            ->pluck('total', 'type_session');

        $themes = (clone $sessionsInPeriod)
            ->join('formations', 'formations.id', '=', 'sessions_formation.formation_id')
            ->join('themes', 'themes.id', '=', 'formations.theme_id')
            ->selectRaw('themes.nom, count(*) as total')
            ->groupBy('themes.nom')
            ->pluck('total', 'themes.nom');

        $absences = (clone $absencesInPeriod)
            ->selectRaw('session_formation_id, count(*) as total')
            ->groupBy('session_formation_id')
            ->pluck('total', 'session_formation_id');

        $totalSessions = (clone $sessionsInPeriod)
            ->pluck('sessions_formation.id')
            ->unique()
            ->count();
        $totalAbsences = (clone $absencesInPeriod)->count();

        $series = collect();
        $cursor = $dateFrom->copy();

        while ($cursor->lte($dateTo)) {
            $day = $cursor->toDateString();
            $sessionCount = (clone $this->regionalSessions($request))
                ->whereDate('date_session', '<=', $day)
                ->whereDate('date_session', '>=', $day)
                ->count();
            $absenceCount = (clone $this->regionalAbsences($request))
                ->whereDate('date_absence', $day)
                ->count();

            $series->push([
                'date' => $day,
                'sessions' => $sessionCount,
                'absences' => $absenceCount,
            ]);

            $cursor->addDay();
        }

        return response()->json([
            'region' => $region ?: 'Aucune region affectee',
            'date_from' => $dateFrom->toDateString(),
            'date_to' => $dateTo->toDateString(),
            'total_sessions' => $totalSessions,
            'total_absences' => $totalAbsences,
            'max_daily_value' => max(1, $series->max(fn ($row) => max($row['sessions'], $row['absences'])) ?? 1),
            'series' => $series->values(),
            'plans_par_statut' => $plans,
            'sessions_par_type' => $sessions,
            'formations_par_theme' => $themes,
            'absences_par_session' => $absences,
            'participants' => $this->regionalParticipants($request)->count(),
        ]);
    }
}
