<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Absence;
use App\Models\AbsenceMessage;
use App\Models\Document;
use App\Models\Participation;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use JsonException;

class ParticipantAdvisorController extends Controller
{
    public function __invoke(Request $request)
    {
        $payload = $request->validate([
            'messages' => ['nullable', 'array', 'max:30'],
            'messages.*.role' => ['required', 'in:user,assistant'],
            'messages.*.content' => ['required', 'string', 'max:2000'],
            'language' => ['nullable', 'in:fr,en,ar'],
        ]);

        $language = $payload['language'] ?? 'fr';
        $messages = collect($payload['messages'] ?? [])
            ->map(fn (array $message) => [
                'role' => $message['role'],
                'content' => trim((string) $message['content']),
            ])
            ->filter(fn (array $message) => $message['content'] !== '')
            ->values();

        $context = $this->buildParticipantContext((int) $request->user()->id);
        $advisor = $this->generateAdvisorReply($messages, $context, $language);

        return response()->json([
            'reply' => $advisor['reply'],
            'questions' => array_values($advisor['questions'] ?? []),
            'disclaimer' => $advisor['disclaimer'] ?? $this->defaultDisclaimer($language),
            'used_ai' => (bool) ($advisor['used_ai'] ?? false),
            'summary' => $context['summary'],
        ]);
    }

    private function buildParticipantContext(int $participantId): array
    {
        $participations = Participation::query()
            ->where('participant_id', $participantId)
            ->with([
                'evaluation:id,participation_id,note,satisfaction,commentaire,competences_acquises,date_evaluation',
                'sessionFormation' => function ($query) {
                    $query->with([
                        'formation:id,titre,theme_id',
                        'formation.theme:id,nom',
                        'animateur:id,nom,prenom,email',
                        'documents:id,titre,type,file_path,session_formation_id',
                        'lignePlanFormation:id,plan_formation_id',
                        'lignePlanFormation.planFormation:id,titre,annee,statut,periode_debut,periode_fin',
                    ]);
                },
            ])
            ->orderByDesc('date_inscription')
            ->limit(24)
            ->get();

        $sessions = $participations
            ->map(function (Participation $participation) {
                $session = $participation->sessionFormation;
                if (!$session) {
                    return null;
                }

                $plan = $session->lignePlanFormation?->planFormation;
                $animateur = $session->animateur;

                return [
                    'session_id' => (int) $session->id,
                    'formation' => $session->formation?->titre,
                    'theme' => $session->formation?->theme?->nom,
                    'date_session' => optional($session->date_session)->toDateString(),
                    'type_session' => $session->type_session,
                    'statut' => $session->statut,
                    'is_finished' => (bool) $session->is_finished,
                    'mode_participation' => $participation->mode_participation,
                    'ville' => $session->ville,
                    'region' => $session->region,
                    'lieu' => $session->lieu,
                    'plateforme' => $session->plateforme,
                    'animateur' => $animateur ? trim(($animateur->prenom ?? '') . ' ' . ($animateur->nom ?? '')) : null,
                    'documents_count' => (int) $session->documents->count(),
                    'has_evaluation' => (bool) $participation->evaluation,
                    'plan' => $plan ? [
                        'id' => (int) $plan->id,
                        'titre' => $plan->titre,
                        'annee' => $plan->annee,
                        'statut' => $plan->statut,
                        'periode_debut' => optional($plan->periode_debut)->toDateString(),
                        'periode_fin' => optional($plan->periode_fin)->toDateString(),
                    ] : null,
                ];
            })
            ->filter()
            ->values();

        $documents = Document::query()
            ->whereHas('sessionFormation.participations', fn ($query) => $query->where('participant_id', $participantId))
            ->with([
                'sessionFormation:id,formation_id,date_session,type_session,statut',
                'sessionFormation.formation:id,titre',
            ])
            ->latest()
            ->limit(20)
            ->get()
            ->map(fn (Document $document) => [
                'id' => (int) $document->id,
                'titre' => $document->titre,
                'type' => $document->type,
                'file_path' => $document->file_path,
                'formation' => $document->sessionFormation?->formation?->titre,
                'session_id' => $document->session_formation_id ? (int) $document->session_formation_id : null,
                'date_session' => optional($document->sessionFormation?->date_session)->toDateString(),
            ])
            ->values();

        $absences = Absence::query()
            ->where('participant_id', $participantId)
            ->with(['sessionFormation:id,formation_id,date_session,statut', 'sessionFormation.formation:id,titre'])
            ->latest('date_absence')
            ->limit(30)
            ->get()
            ->map(fn (Absence $absence) => [
                'id' => (int) $absence->id,
                'date_absence' => optional($absence->date_absence)->toDateString(),
                'statut' => $absence->statut,
                'justification' => $absence->justification,
                'formation' => $absence->sessionFormation?->formation?->titre,
                'session_id' => $absence->session_formation_id ? (int) $absence->session_formation_id : null,
                'session_status' => $absence->sessionFormation?->statut,
            ])
            ->values();

        $absenceMessages = AbsenceMessage::query()
            ->where('participant_id', $participantId)
            ->with(['sessionFormation:id,formation_id,date_session', 'sessionFormation.formation:id,titre', 'animateur:id,nom,prenom'])
            ->latest()
            ->limit(12)
            ->get()
            ->map(fn (AbsenceMessage $message) => [
                'id' => (int) $message->id,
                'subject' => $message->subject,
                'message' => Str::limit((string) $message->message, 280),
                'is_read' => $message->read_at !== null,
                'sent_at' => optional($message->created_at)->toDateTimeString(),
                'formation' => $message->sessionFormation?->formation?->titre,
                'session_id' => $message->session_formation_id ? (int) $message->session_formation_id : null,
                'animateur' => $message->animateur ? trim(($message->animateur->prenom ?? '') . ' ' . ($message->animateur->nom ?? '')) : null,
            ])
            ->values();

        $today = now()->toDateString();
        $totalSessions = $sessions->count();
        $upcomingSessions = $sessions->filter(fn (array $session) => !empty($session['date_session']) && $session['date_session'] >= $today && !in_array($session['statut'], ['terminee', 'annulee'], true))->count();
        $finishedSessions = $sessions->filter(fn (array $session) => (bool) ($session['is_finished'] ?? false) || ($session['statut'] ?? '') === 'terminee')->count();
        $pendingEvaluations = $sessions->filter(fn (array $session) => ((bool) ($session['is_finished'] ?? false) || ($session['statut'] ?? '') === 'terminee') && !($session['has_evaluation'] ?? false))->count();

        return [
            'summary' => [
                'total_sessions' => $totalSessions,
                'upcoming_sessions' => $upcomingSessions,
                'finished_sessions' => $finishedSessions,
                'pending_evaluations' => $pendingEvaluations,
                'documents_available' => $documents->count(),
                'total_absences' => $absences->count(),
                'unread_absence_messages' => $absenceMessages->where('is_read', false)->count(),
            ],
            'sessions' => $sessions->all(),
            'documents' => $documents->all(),
            'absences' => $absences->all(),
            'absence_messages' => $absenceMessages->all(),
        ];
    }

    private function generateAdvisorReply(Collection $messages, array $context, string $language): array
    {
        if (!$this->hasAiAdvisorCredentials()) {
            return $this->buildFallbackReply($messages, $context, $language);
        }

        try {
            $response = $this->requestAiProvider($messages, $context, $language);
            $decoded = $this->decodeModelJson($response);

            if (!$decoded) {
                return $this->buildFallbackReply($messages, $context, $language);
            }

            $reply = trim((string) ($decoded['reply'] ?? ''));
            if ($reply === '') {
                return $this->buildFallbackReply($messages, $context, $language);
            }

            return [
                'reply' => $reply,
                'questions' => array_values(array_filter(array_map('strval', $decoded['follow_up_questions'] ?? []))),
                'disclaimer' => trim((string) ($decoded['safety_note'] ?? $this->defaultDisclaimer($language))),
                'used_ai' => true,
            ];
        } catch (\Throwable $exception) {
            Log::warning('Participant advisor request failed, fallback used.', [
                'message' => $exception->getMessage(),
            ]);

            return $this->buildFallbackReply($messages, $context, $language);
        }
    }

    private function decodeModelJson(array $response): ?array
    {
        $raw = $response['output_text']
            ?? data_get($response, 'output.0.content.0.text')
            ?? data_get($response, 'choices.0.message.content')
            ?? data_get($response, 'candidates.0.content.parts.0.text');

        if (is_array($raw)) {
            $raw = collect($raw)
                ->map(fn ($chunk) => is_array($chunk) ? ($chunk['text'] ?? '') : (string) $chunk)
                ->implode("\n");
        }

        if (!is_string($raw) || trim($raw) === '') {
            return null;
        }

        $normalized = trim($raw);
        if (preg_match('/```(?:json)?\s*(\{.*\})\s*```/su', $normalized, $matches)) {
            $normalized = $matches[1];
        }

        try {
            $decoded = json_decode($normalized, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            return null;
        }

        return is_array($decoded) ? $decoded : null;
    }

    private function buildSystemPrompt(string $language): string
    {
        $languageName = match ($language) {
            'en' => 'English',
            'ar' => 'Arabic',
            default => 'French',
        };

        return <<<PROMPT
You are a personal training assistant for one participant in OFPPT Formation.
Respond in {$languageName}.
Only use the participant snapshot that is provided to you.

Rules:
- Never invent sessions, plans, documents, absences, dates, statuses, or evaluations.
- If data is missing, clearly say it is not available in the snapshot.
- Explain with short, practical language.
- Ask up to 3 short follow-up questions only when needed.
- Keep answers concise and action-oriented for the participant.
- For medical or legal requests, advise contacting the relevant professional.
- Return valid JSON only, without markdown or extra text.

Return this JSON shape:
{
  "reply": "string",
  "follow_up_questions": ["string"],
  "safety_note": "string"
}
PROMPT;
    }

    private function buildModelInput(Collection $messages, array $context, string $language): string
    {
        $transcript = $messages->map(function (array $message) {
            $speaker = $message['role'] === 'assistant' ? 'Assistant' : 'Participant';
            return "{$speaker}: {$message['content']}";
        })->implode("\n");

        return json_encode([
            'language' => $language,
            'conversation' => $transcript,
            'participant_snapshot' => $context,
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    private function hasAiAdvisorCredentials(): bool
    {
        return trim((string) $this->resolveApiKey()) !== '';
    }

    private function requestAiProvider(Collection $messages, array $context, string $language): array
    {
        return $this->usesGemini()
            ? $this->requestGemini($messages, $context, $language)
            : $this->requestOpenAiCompatible($messages, $context, $language);
    }

    private function requestOpenAiCompatible(Collection $messages, array $context, string $language): array
    {
        $baseUrl = rtrim((string) config('services.ai_advisor.base_url', 'https://api.groq.com/openai/v1'), '/');

        return Http::timeout(25)
            ->acceptJson()
            ->withOptions($this->aiHttpOptions())
            ->withToken($this->resolveApiKey())
            ->post("{$baseUrl}/chat/completions", [
                'model' => config('services.ai_advisor.model', 'llama-3.3-70b-versatile'),
                'temperature' => 0.25,
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => $this->buildSystemPrompt($language),
                    ],
                    [
                        'role' => 'user',
                        'content' => $this->buildModelInput($messages, $context, $language),
                    ],
                ],
            ])
            ->throw()
            ->json();
    }

    private function requestGemini(Collection $messages, array $context, string $language): array
    {
        $model = (string) config('services.gemini.model', 'gemini-2.5-flash');
        $baseUrl = rtrim((string) config('services.gemini.base_url', 'https://generativelanguage.googleapis.com/v1beta'), '/');

        return Http::timeout(25)
            ->acceptJson()
            ->withOptions($this->aiHttpOptions())
            ->withHeaders([
                'x-goog-api-key' => $this->resolveApiKey(),
            ])
            ->post("{$baseUrl}/models/{$model}:generateContent", [
                'systemInstruction' => [
                    'parts' => [
                        ['text' => $this->buildSystemPrompt($language)],
                    ],
                ],
                'contents' => [
                    [
                        'role' => 'user',
                        'parts' => [
                            ['text' => $this->buildModelInput($messages, $context, $language)],
                        ],
                    ],
                ],
                'generationConfig' => [
                    'temperature' => 0.25,
                ],
            ])
            ->throw()
            ->json();
    }

    private function usesGemini(): bool
    {
        return Str::lower((string) config('services.ai_advisor.provider', 'groq')) === 'gemini';
    }

    private function resolveApiKey(): string
    {
        if ($this->usesGemini()) {
            return trim((string) config('services.gemini.api_key'));
        }

        return trim((string) config('services.ai_advisor.api_key'));
    }

    private function aiHttpOptions(): array
    {
        return [
            'curl' => [
                CURLOPT_PROXY => '',
                CURLOPT_NOPROXY => '*',
            ],
            'proxy' => [
                'http' => null,
                'https' => null,
                'no' => ['*'],
            ],
        ];
    }

    private function buildFallbackReply(Collection $messages, array $context, string $language): array
    {
        $latestUserMessage = (string) data_get(
            $messages->reverse()->first(fn (array $message) => ($message['role'] ?? null) === 'user'),
            'content',
            ''
        );
        $normalized = Str::lower($latestUserMessage);
        $summary = $context['summary'] ?? [];
        $sessionCount = (int) ($summary['total_sessions'] ?? 0);
        $upcomingCount = (int) ($summary['upcoming_sessions'] ?? 0);
        $documentCount = (int) ($summary['documents_available'] ?? 0);
        $absenceCount = (int) ($summary['total_absences'] ?? 0);
        $pendingEvaluations = (int) ($summary['pending_evaluations'] ?? 0);

        if (Str::length(trim($latestUserMessage)) < 8) {
            return [
                'reply' => $this->fallbackQuestionIntro($language),
                'questions' => $this->fallbackQuestions($language),
                'disclaimer' => $this->defaultDisclaimer($language),
                'used_ai' => false,
            ];
        }

        if (Str::contains($normalized, ['absence', 'retard', 'justifie'])) {
            $reply = match ($language) {
                'en' => "You currently have {$absenceCount} recorded absence-related record(s). Open the Absences page for full details by date and session.",
                'ar' => "لديك حاليا {$absenceCount} حالة مرتبطة بالغياب. افتح صفحة الغيابات لمعرفة التفاصيل حسب التاريخ والحصة.",
                default => "Vous avez actuellement {$absenceCount} enregistrement(s) lie(s) aux absences. Ouvrez la page Absences pour le detail par date et session.",
            };

            return ['reply' => $reply, 'questions' => [], 'disclaimer' => $this->defaultDisclaimer($language), 'used_ai' => false];
        }

        if (Str::contains($normalized, ['document', 'fichier', 'support'])) {
            $reply = match ($language) {
                'en' => "You currently have {$documentCount} available document(s). Open the Documents page to download them by session.",
                'ar' => "لديك حاليا {$documentCount} وثيقة متاحة. افتح صفحة الوثائق لتحميلها حسب كل حصة.",
                default => "Vous avez actuellement {$documentCount} document(s) disponible(s). Ouvrez la page Documents pour les telecharger par session.",
            };

            return ['reply' => $reply, 'questions' => [], 'disclaimer' => $this->defaultDisclaimer($language), 'used_ai' => false];
        }

        if (Str::contains($normalized, ['session', 'seance', 'planning'])) {
            $reply = match ($language) {
                'en' => "You have {$sessionCount} session(s) in total, including {$upcomingCount} upcoming session(s). Check the Sessions page for dates, QR details, and status.",
                'ar' => "لديك {$sessionCount} حصة إجمالا، منها {$upcomingCount} حصة قادمة. راجع صفحة الحصص للتواريخ وحالة كل حصة وبيانات QR.",
                default => "Vous avez {$sessionCount} session(s) au total, dont {$upcomingCount} a venir. Consultez la page Sessions pour les dates, le QR et le statut.",
            };

            return ['reply' => $reply, 'questions' => [], 'disclaimer' => $this->defaultDisclaimer($language), 'used_ai' => false];
        }

        $reply = match ($language) {
            'en' => "Quick summary: {$sessionCount} session(s), {$upcomingCount} upcoming, {$documentCount} document(s), {$absenceCount} absence record(s), and {$pendingEvaluations} evaluation(s) still pending.",
            'ar' => "ملخص سريع: {$sessionCount} حصة، {$upcomingCount} قادمة، {$documentCount} وثيقة، {$absenceCount} حالة غياب، و {$pendingEvaluations} تقييم لم يكتمل بعد.",
            default => "Resume rapide: {$sessionCount} session(s), {$upcomingCount} a venir, {$documentCount} document(s), {$absenceCount} absence(s), et {$pendingEvaluations} evaluation(s) en attente.",
        };

        return [
            'reply' => $reply,
            'questions' => $this->fallbackQuestions($language),
            'disclaimer' => $this->defaultDisclaimer($language),
            'used_ai' => false,
        ];
    }

    private function fallbackQuestionIntro(string $language): string
    {
        return match ($language) {
            'en' => 'I can help with your sessions, plans, documents, absences, and evaluations. Tell me what you need.',
            'ar' => 'يمكنني مساعدتك بخصوص الحصص والخطط والوثائق والغيابات والتقييمات. اكتب لي ما تحتاجه.',
            default => 'Je peux vous aider pour vos sessions, plans, documents, absences et evaluations. Dites-moi votre besoin.',
        };
    }

    private function fallbackQuestions(string $language): array
    {
        return match ($language) {
            'en' => [
                'Do you want information about your upcoming sessions?',
                'Do you need help with your documents or downloads?',
                'Do you want to check your absences or pending evaluations?',
            ],
            'ar' => [
                'هل تريد معرفة حصصك القادمة؟',
                'هل تحتاج مساعدة في الوثائق أو التحميل؟',
                'هل تريد مراجعة الغيابات أو التقييمات المعلقة؟',
            ],
            default => [
                'Voulez-vous des details sur vos sessions a venir ?',
                'Avez-vous besoin d aide pour vos documents ou telechargements ?',
                'Voulez-vous verifier vos absences ou vos evaluations en attente ?',
            ],
        };
    }

    private function defaultDisclaimer(string $language): string
    {
        return match ($language) {
            'en' => 'This assistant is informational and based on your current training data in OFPPT Formation.',
            'ar' => 'هذا المساعد يقدم معلومات فقط بناء على بياناتك الحالية داخل منصة OFPPT Formation.',
            default => 'Cet assistant est informatif et base sur vos donnees actuelles dans OFPPT Formation.',
        };
    }
}

