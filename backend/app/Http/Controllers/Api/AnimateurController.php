<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AbsenceRequest;
use App\Http\Requests\DocumentRequest;
use App\Http\Resources\AbsenceResource;
use App\Http\Resources\AbsenceMessageResource;
use App\Http\Resources\DocumentResource;
use App\Http\Resources\ParticipationResource;
use App\Http\Resources\SessionResource;
use App\Models\Absence;
use App\Models\AbsenceMessage;
use App\Models\Document;
use App\Models\Participation;
use App\Models\SessionFormation;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AnimateurController extends Controller
{
    private function assigned(Request $request, SessionFormation $session): bool { return $session->animateur_id === $request->user()->id; }

    public function dashboard(Request $request)
    {
        $sessions = SessionFormation::where('animateur_id',$request->user()->id);
        return response()->json([
            'mes_sessions_a_venir' => (clone $sessions)->where('date_session','>',now()->toDateString())->count(),
            'mes_sessions_en_cours' => (clone $sessions)->where('statut','en_cours')->count(),
            'participants' => DB::table('participations')->join('sessions_formation','sessions_formation.id','=','participations.session_formation_id')->where('sessions_formation.animateur_id',$request->user()->id)->count(),
            'absences_enregistrees' => DB::table('absences')->join('sessions_formation','sessions_formation.id','=','absences.session_formation_id')->where('sessions_formation.animateur_id',$request->user()->id)->count(),
            'documents_ajoutes' => Document::where('uploaded_by',$request->user()->id)->count(),
        ]);
    }

    public function sessions(Request $request) { return SessionResource::collection(SessionFormation::with(['formation.theme','participations.participant','documents'])->where('animateur_id',$request->user()->id)->latest()->get()); }
    public function showSession(Request $request, SessionFormation $session) { if(!$this->assigned($request,$session)) return response()->json(['message'=>'Acces interdit.'],403); return new SessionResource($session->load(['formation.theme','participations.participant','documents','absences.participant'])); }
    public function participants(Request $request, SessionFormation $session) { if(!$this->assigned($request,$session)) return response()->json(['message'=>'Acces interdit.'],403); return ParticipationResource::collection($session->participations()->with('participant')->get()); }

    public function finishSession(Request $request, SessionFormation $session)
    {
        if (!$this->assigned($request, $session)) {
            return response()->json(['message' => 'Acces interdit.'], 403);
        }

        if ($session->date_session->isFuture()) {
            throw ValidationException::withMessages([
                'date_session' => 'La session peut etre terminee uniquement le jour de la session ou apres cette date.',
            ]);
        }

        if ($session->statut === 'annulee') {
            return response()->json(['message' => 'Une session annulee ne peut pas etre terminee.'], 422);
        }

        $session->update([
            'statut' => 'terminee',
            'is_finished' => true,
            'finished_at' => now(),
        ]);

        return response()->json([
            'message' => 'Session terminee avec succes.',
            'session' => (new SessionResource($session->fresh(['formation.theme','participations.participant','documents','absences.participant'])))->resolve($request),
        ]);
    }

    private function cleanQrToken(string $token): string
    {
        return str_starts_with($token, 'OFPPT_SESSION:')
            ? substr($token, strlen('OFPPT_SESSION:'))
            : $token;
    }

    private function findParticipationByQrToken(string $token, int $animateurId): ?Participation
{
    $token = $this->cleanQrToken($token);

    $participations = Participation::with(['participant', 'sessionFormation.formation'])
        ->whereNotNull('qr_token_hash')
        ->whereHas('sessionFormation', function ($q) use ($animateurId) {
            $q->where('animateur_id', $animateurId)
                ->where(function ($sub) {
                    $sub->where('type_session', 'presentielle')
                        ->orWhere('type_session', 'hybride');
                });
        })
        ->latest('id')
        ->get();

    foreach ($participations as $participation) {
        if (!Hash::check($token, $participation->qr_token_hash)) {
            continue;
        }

        return $participation;
    }

    return null;
}

private function findParticipationByQrTokenForSession(string $token, SessionFormation $session): ?Participation
{
    $token = $this->cleanQrToken($token);

    $participations = $session->participations()
        ->with(['participant', 'sessionFormation.formation'])
        ->whereNotNull('qr_token_hash')
        ->latest('id')
        ->get();

    foreach ($participations as $participation) {
        if (Hash::check($token, $participation->qr_token_hash)) {
            return $participation;
        }
    }

    return null;
}

private function qrAllowedForParticipation(Participation $participation): bool
{
    $session = $participation->sessionFormation;

    if (!$session) {
        return false;
    }

    return $session->type_session === 'presentielle';
}

private function markQrPresence(Participation $participation, SessionFormation $session, Request $request): Absence
{
    $today = now()->toDateString();

    $absence = Absence::where('session_formation_id', $session->id)
        ->where('participant_id', $participation->participant_id)
        ->whereDate('date_absence', $today)
        ->first();

    if (!$absence) {
        $absence = new Absence([
            'session_formation_id' => $session->id,
            'participant_id' => $participation->participant_id,
            'date_absence' => $today,
        ]);
    }

    $absence->fill([
        'statut' => 'present',
        'justification' => 'Presence validee par QR Code',
        'created_by' => $request->user()->id,
    ]);
    $absence->save();

    AuditLogger::record(
        $request,
        'qr_presence_confirmed',
        'Sessions',
        "Confirmation de presence QR pour {$participation->participant?->nom_complet}.",
        [
            'session_id' => $session->id,
            'participant_id' => $participation->participant_id,
            'absence_id' => $absence->id,
            'date_absence' => optional($absence->date_absence)->toDateString(),
        ],
        (int) $participation->participant_id
    );

    return $absence;
}

public function verifyQr(Request $request)
{
    $data = $request->validate([
        'token' => ['required', 'string'],
    ]);

    $participation = $this->findParticipationByQrToken($data['token'], $request->user()->id);

    if (!$participation) {
        return response()->json(['message' => 'QR code invalide pour vos sessions.'], 422);
    }

    if (!$this->qrAllowedForParticipation($participation)) {
        return response()->json([
            'message' => 'Ce QR code n’est pas autorisé pour ce type de session.'
        ], 422);
    }

    if (
        !$participation->qr_token_expires_at ||
        now()->greaterThanOrEqualTo($participation->qr_token_expires_at)
    ) {
        return response()->json(['message' => 'QR code expiré.'], 422);
    }

    $session = $participation->sessionFormation;

    $today = now()->toDateString();

    $attendance = Absence::where('session_formation_id', $session->id)
        ->where('participant_id', $participation->participant_id)
        ->whereDate('date_absence', $today)
        ->first();

    return response()->json([
        'message' => 'QR code valide.',
        'participant' => [
            'id' => $participation->participant->id,
            'nom_complet' => $participation->participant->nom_complet,
            'email' => $participation->participant->email,
            'mode_participation' => $participation->mode_participation,
        ],
        'session' => [
            'id' => $session->id,
            'formation' => $session->formation?->titre,
            'date_session' => optional($session->date_session)->toDateString(),
            'type_session' => $session->type_session,
            'lieu' => $session->lieu,
            'salle' => $session->salle,
            'plateforme' => $session->plateforme,
            'lien_visio' => $session->lien_visio,
        ],
        'attendance' => [
            'date' => $today,
            'statut' => $attendance?->statut ?? 'non_enregistre',
            'already_recorded' => (bool) $attendance,
        ],
        'expires_at' => $participation->qr_token_expires_at->toISOString(),
    ]);
}

public function confirmQrPresence(Request $request)
{
    $data = $request->validate([
        'token' => ['required', 'string'],
    ]);

    $participation = $this->findParticipationByQrToken($data['token'], $request->user()->id);

    if (!$participation) {
        return response()->json(['message' => 'QR code invalide pour vos sessions.'], 422);
    }

    if (!$this->qrAllowedForParticipation($participation)) {
        return response()->json([
            'message' => 'Ce QR code n’est pas autorisé pour ce type de session.'
        ], 422);
    }

    if (
        !$participation->qr_token_expires_at ||
        now()->greaterThanOrEqualTo($participation->qr_token_expires_at)
    ) {
        return response()->json(['message' => 'QR code expiré.'], 422);
    }

    $session = $participation->sessionFormation;
    $today = now()->toDateString();

    if ($today !== $session->date_session->toDateString()) {
        return response()->json([
            'message' => 'La presence peut etre confirmee uniquement a la date de la session.'
        ], 422);
    }

    $absence = $this->markQrPresence($participation, $session, $request);

    return response()->json([
        'message' => 'Présence confirmée avec succès.',
        'attendance' => [
            'id' => $absence->id,
            'date_absence' => optional($absence->date_absence)->toDateString(),
            'statut' => $absence->statut,
            'justification' => $absence->justification,
        ],
        'participant' => [
            'id' => $participation->participant->id,
            'nom_complet' => $participation->participant->nom_complet,
            'email' => $participation->participant->email,
        ],
        'session' => [
            'id' => $session->id,
            'formation' => $session->formation?->titre,
            'date_session' => optional($session->date_session)->toDateString(),
            'type_session' => $session->type_session,
            'lieu' => $session->lieu,
            'salle' => $session->salle,
        ],
    ]);
}

public function scanQrForSession(Request $request, SessionFormation $session)
{
    if (!$this->assigned($request, $session)) {
        return response()->json(['message' => 'Acces interdit.'], 403);
    }

    $data = $request->validate([
        'token' => ['required', 'string'],
    ]);

    $participation = $this->findParticipationByQrTokenForSession($data['token'], $session);

    if (!$participation) {
        return response()->json(['message' => 'Ce QR code ne correspond pas a la session selectionnee.'], 422);
    }

    if (!$this->qrAllowedForParticipation($participation)) {
        return response()->json([
            'message' => 'Ce QR code n est pas autorise pour ce type de session.'
        ], 422);
    }

    if (
        !$participation->qr_token_expires_at ||
        now()->greaterThanOrEqualTo($participation->qr_token_expires_at)
    ) {
        return response()->json(['message' => 'QR code expire.'], 422);
    }

    $today = now()->toDateString();

    if ($today !== $session->date_session->toDateString()) {
        return response()->json([
            'message' => 'La presence peut etre confirmee uniquement a la date de la session.'
        ], 422);
    }

    $absence = $this->markQrPresence($participation, $session, $request);

    return response()->json([
        'message' => 'QR code valide. Presence confirmee.',
        'participant' => [
            'id' => $participation->participant->id,
            'nom_complet' => $participation->participant->nom_complet,
            'email' => $participation->participant->email,
            'mode_participation' => $participation->mode_participation,
        ],
        'session' => [
            'id' => $session->id,
            'formation' => $session->formation?->titre,
            'date_session' => optional($session->date_session)->toDateString(),
            'type_session' => $session->type_session,
            'lieu' => $session->lieu,
            'salle' => $session->salle,
            'plateforme' => $session->plateforme,
            'lien_visio' => $session->lien_visio,
        ],
        'attendance' => [
            'id' => $absence->id,
            'date_absence' => optional($absence->date_absence)->toDateString(),
            'statut' => $absence->statut,
            'justification' => $absence->justification,
        ],
        'expires_at' => $participation->qr_token_expires_at->toISOString(),
    ]);
}

    public function listAbsences(Request $request, SessionFormation $session)
    {
        if(!$this->assigned($request,$session)) return response()->json(['message'=>'Acces interdit.'],403);
        return AbsenceResource::collection($session->absences()->with('participant')->latest('date_absence')->get());
    }

    public function sendAbsenceMessage(Request $request, SessionFormation $session)
    {
        if(!$this->assigned($request,$session)) return response()->json(['message'=>'Acces interdit.'],403);

        $data = $request->validate([
            'participant_id' => ['required', 'exists:users,id'],
            'subject' => ['nullable', 'string', 'max:160'],
            'message' => ['required', 'string', 'min:3', 'max:2000'],
            'statut' => ['nullable', 'in:absent,retard,justifie'],
            'justification' => ['nullable', 'string'],
            'date_absence' => ['nullable', 'date'],
        ]);

        if (!$session->participations()->where('participant_id', $data['participant_id'])->exists()) {
            throw ValidationException::withMessages(['participant_id' => 'Participant non inscrit a cette session.']);
        }

        $absence = $session->absences()
            ->where('participant_id', $data['participant_id'])
            ->whereIn('statut', ['absent', 'retard', 'justifie'])
            ->latest('date_absence')
            ->first();

        if (!$absence) {
            $dateAbsence = $request->date('date_absence') ?: $session->date_session;
            if (!$dateAbsence->isSameDay($session->date_session)) {
                throw ValidationException::withMessages([
                    'date_absence' => 'La date doit correspondre a la date de la session.',
                ]);
            }

            $absence = Absence::firstOrCreate([
                'session_formation_id' => $session->id,
                'participant_id' => $data['participant_id'],
                'date_absence' => $dateAbsence->toDateString(),
            ], [
                'statut' => $data['statut'] ?? 'absent',
                'justification' => $data['justification'] ?? 'Message envoye par l animateur',
                'created_by' => $request->user()->id,
            ]);

            if ($absence->statut === 'present') {
                $absence->update([
                    'statut' => $data['statut'] ?? 'absent',
                    'justification' => $data['justification'] ?? 'Message envoye par l animateur',
                    'created_by' => $request->user()->id,
                ]);
            }
        }

        $message = AbsenceMessage::create([
            'session_formation_id' => $session->id,
            'participant_id' => $data['participant_id'],
            'animateur_id' => $request->user()->id,
            'absence_id' => $absence->id,
            'subject' => $data['subject'] ?: 'Message concernant votre absence',
            'message' => $data['message'],
        ]);

        return (new AbsenceMessageResource($message->load(['sessionFormation.formation', 'participant', 'animateur', 'absence'])))->response()->setStatusCode(201);
    }

    public function recordAbsences(AbsenceRequest $request, SessionFormation $session)
    {
        if(!$this->assigned($request,$session)) return response()->json(['message'=>'Acces interdit.'],403);
        $date = $request->date('date_absence');
        if (!$date->isSameDay($session->date_session)) throw ValidationException::withMessages(['date_absence'=>'La date doit correspondre a la date de la session.']);

        $created = DB::transaction(function() use ($request, $session) {
            $rows = [];
            $targetDate = $request->date('date_absence')->toDateString();
            $lines = collect($request->input('absences'))
                ->map(fn ($line) => [
                    'participant_id' => (int) $line['participant_id'],
                    'statut' => $line['statut'],
                    'justification' => $line['justification'] ?? null,
                ])
                ->keyBy('participant_id')
                ->values();

            $participantIds = $lines->pluck('participant_id')->all();
            $enrolledIds = $session->participations()
                ->whereIn('participant_id', $participantIds)
                ->pluck('participant_id')
                ->map(fn ($participantId) => (int) $participantId)
                ->all();

            if (count($enrolledIds) !== count($participantIds)) {
                throw ValidationException::withMessages(['absences' => 'Participant non inscrit a cette session.']);
            }

            foreach ($lines as $line) {
                $existing = $session->absences()
                    ->where('participant_id', $line['participant_id'])
                    ->whereDate('date_absence', $targetDate)
                    ->first();

                if ($existing) {
                    $existing->fill([
                        'statut' => $line['statut'],
                        'justification' => $line['justification'],
                        'created_by' => $request->user()->id,
                    ])->save();

                    $rows[] = $existing->fresh();
                    continue;
                }

                $rows[] = Absence::create([
                    'session_formation_id' => $session->id,
                    'participant_id' => $line['participant_id'],
                    'date_absence' => $targetDate,
                    'statut' => $line['statut'],
                    'justification' => $line['justification'],
                    'created_by' => $request->user()->id,
                ]);
            }
            return $rows;
        });
        return AbsenceResource::collection(collect($created))->response()->setStatusCode(201);
    }

    public function uploadDocument(DocumentRequest $request, SessionFormation $session)
    {
        if(!$this->assigned($request,$session)) return response()->json(['message'=>'Acces interdit.'],403);
        $path = $request->file('file') ? $request->file('file')->store('documents', 'public') : ($request->file_path ?: 'documents/session-demo.txt');
        $doc = Document::create(['titre'=>$request->titre,'type'=>$request->type,'file_path'=>$path,'session_formation_id'=>$session->id,'formation_id'=>$session->formation_id,'uploaded_by'=>$request->user()->id]);

        AuditLogger::record(
            $request,
            'document_uploaded',
            'Documents',
            "Ajout d un document sur la session {$session->id}.",
            [
                'document_id' => $doc->id,
                'session_id' => $session->id,
                'formation_id' => $session->formation_id,
                'type' => $doc->type,
                'file_path' => $doc->file_path,
            ]
        );

        return (new DocumentResource($doc))->response()->setStatusCode(201);
    }
}
