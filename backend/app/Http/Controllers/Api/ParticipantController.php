<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\EvaluationRequest;
use App\Http\Resources\AbsenceMessageResource;
use App\Http\Resources\AbsenceResource;
use App\Http\Resources\DocumentResource;
use App\Http\Resources\ParticipationResource;
use App\Http\Resources\SessionResource;
use App\Models\Document;
use App\Models\Evaluation;
use App\Models\AbsenceMessage;
use App\Models\Participation;
use App\Models\SessionFormation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ParticipantController extends Controller
{
    private function participation(Request $request, SessionFormation $session): ?Participation
    {
        return $session->participations()->where('participant_id',$request->user()->id)->first();
    }

    public function dashboard(Request $request)
    {
        $sessions = SessionFormation::whereHas('participations', fn($q)=>$q->where('participant_id',$request->user()->id));
        return response()->json([
            'mes_sessions_a_venir' => (clone $sessions)->where('date_session','>',now()->toDateString())->count(),
            'mes_sessions_en_cours' => (clone $sessions)->where('statut','en_cours')->count(),
            'mes_sessions_terminees' => (clone $sessions)->where('is_finished', true)->count(),
            'documents_disponibles' => Document::whereHas('sessionFormation.participations', fn($q)=>$q->where('participant_id',$request->user()->id))->count(),
            'evaluations_a_remplir' => Participation::where('participant_id',$request->user()->id)->whereDoesntHave('evaluation')->whereHas('sessionFormation',fn($q)=>$q->where('is_finished', true))->count(),
        ]);
    }

    public function sessions(Request $request) { return SessionResource::collection(SessionFormation::with(['formation.theme','participations.evaluation','documents'])->whereHas('participations', fn($q)=>$q->where('participant_id',$request->user()->id))->latest()->get()); }
    public function showSession(Request $request, SessionFormation $session)
    {
        $participation = $this->participation($request, $session);
        if (!$participation) return response()->json(['message'=>'Acces interdit.'],403);

        $session->load(['formation.theme','participations.participant','participations.evaluation','documents']);
        $participation->load('evaluation');

        return response()->json((new SessionResource($session))->resolve($request) + [
            'current_participation' => (new ParticipationResource($participation))->resolve($request),
        ]);
    }
    public function qrCode(Request $request, SessionFormation $session)
{
    $participation = $this->participation($request, $session);

    if (!$participation) {
        return response()->json(['message' => 'Accès interdit.'], 403);
    }

    if ($session->type_session !== 'presentielle') {
        return response()->json([
            'message' => 'Le QR code est disponible uniquement pour les sessions présentielles.'
        ], 422);
    }

    $expiresAt = $session->date_session->copy()->addDay()->startOfDay();

    if (now()->greaterThanOrEqualTo($expiresAt)) {
        return response()->json([
            'message' => 'Le QR code de cette session est expiré.'
        ], 422);
    }

    $token = Str::random(64);

    $participation->update([
        'qr_token_hash' => Hash::make($token),
        'qr_token_expires_at' => $expiresAt,
    ]);

    return response()->json([
        'message' => 'QR code généré avec succès.',
        'qr_payload' => 'OFPPT_SESSION:' . $token,
        'expires_at' => $expiresAt->toISOString(),
        'session' => [
            'id' => $session->id,
            'formation' => $session->formation?->titre,
            'date_session' => optional($session->date_session)->toDateString(),
            'type_session' => $session->type_session,
            'lieu' => $session->lieu,
            'salle' => $session->salle,
        ],
        'participant' => [
            'id' => $request->user()->id,
            'nom_complet' => $request->user()->nom_complet,
            'email' => $request->user()->email,
        ],
    ]);
}
    public function documents(Request $request) { return DocumentResource::collection(Document::whereHas('sessionFormation.participations', fn($q)=>$q->where('participant_id',$request->user()->id))->latest()->get()); }
    public function downloadDocument(Request $request, Document $document)
    {
        $allowed = $document->sessionFormation()
            ->whereHas('participations', fn($q) => $q->where('participant_id', $request->user()->id))
            ->exists();
        if (!$allowed) return response()->json(['message'=>'Acces interdit.'],403);
        if (!$document->file_path || !Storage::disk('public')->exists($document->file_path)) {
            return response()->json(['message'=>'Fichier introuvable.'],404);
        }
        return Storage::disk('public')->download($document->file_path, basename($document->file_path));
    }
    public function absences(Request $request) { return AbsenceResource::collection($request->user()->absences()->with('sessionFormation.formation','participant')->latest('date_absence')->get()); }

    public function messages(Request $request)
    {
        return AbsenceMessageResource::collection(
            $request->user()
                ->absenceMessages()
                ->with(['sessionFormation.formation', 'animateur', 'absence'])
                ->latest()
                ->get()
        );
    }

    public function markMessageRead(Request $request, AbsenceMessage $message)
    {
        if ($message->participant_id !== $request->user()->id) return response()->json(['message'=>'Acces interdit.'],403);

        if (!$message->read_at) {
            $message->update(['read_at' => now()]);
        }

        return new AbsenceMessageResource($message->load(['sessionFormation.formation', 'animateur', 'absence']));
    }

    public function evaluate(EvaluationRequest $request, Participation $participation)
    {
        if ($participation->participant_id !== $request->user()->id) return response()->json(['message'=>'Acces interdit.'],403);
        if (!$participation->sessionFormation->is_finished) throw ValidationException::withMessages(['participation'=>'Evaluation autorisee seulement apres la fin de session.']);
        if ($participation->evaluation()->exists()) throw ValidationException::withMessages(['participation'=>'Evaluation deja envoyee.']);
        $evaluation = Evaluation::create($request->validated() + ['participation_id'=>$participation->id,'date_evaluation'=>now()]);
        return response()->json(['message'=>'Evaluation envoyee.', 'evaluation'=>$evaluation], 201);
    }
}
