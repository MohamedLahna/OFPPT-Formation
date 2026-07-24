<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AdminCreateUserRequest;
use App\Http\Requests\AdminUpdateUserRequest;
use App\Http\Requests\MailSettingRequest;
use App\Http\Resources\FormationResource;
use App\Http\Resources\ThemeResource;
use App\Http\Resources\UserResource;
use App\Models\AuditLog;
use App\Models\Document;
use App\Models\Formation;
use App\Models\Hebergement;
use App\Models\MailSetting;
use App\Models\PlanFormation;
use App\Models\SessionFormation;
use App\Models\Theme;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\TemporaryPasswordService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AdminController extends Controller
{
    public function dashboard()
    {
        return response()->json([
            'total_utilisateurs' => User::count(),
            'comptes_actifs' => User::where('statut', 'actif')->count(),
            'comptes_en_attente_activation' => User::where('statut', 'en_attente_activation')->count(),
            'comptes_suspendus' => User::where('statut', 'suspendu')->count(),
            'plans_formation' => PlanFormation::count(),
            'sessions' => SessionFormation::count(),
            'utilisateurs_par_role' => User::selectRaw('role, count(*) as total')->groupBy('role')->pluck('total', 'role'),
        ]);
    }

    public function users(Request $request)
    {
        $users = User::query()
            ->when($request->search, fn ($query, $search) => $query->where(function ($q) use ($search) {
                $q->where('nom', 'like', "%{$search}%")
                    ->orWhere('prenom', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            }))
            ->when($request->role, fn ($query, $role) => $query->where('role', $role))
            ->when($request->statut, fn ($query, $statut) => $query->where('statut', $statut))
            ->latest()
            ->get();

        return UserResource::collection($users);
    }

    public function createUser(AdminCreateUserRequest $request, TemporaryPasswordService $passwords)
    {
        $temporaryPassword = $passwords->generate();

        $user = User::create([
            'nom' => $request->nom,
            'prenom' => $request->prenom,
            'email' => $request->email,
            'password' => $temporaryPassword,
            'role' => $request->role,
            'region' => $request->region,
            'statut' => 'en_attente_activation',
            'actif' => false,
            'must_change_password' => true,
            'email_verified_at' => null,
            'temporary_password_generated_at' => now(),
            'created_by' => $request->user()->id,
        ]);

        AuditLogger::record(
            $request,
            'user_created',
            'Utilisateurs',
            "Creation d un nouveau compte: {$user->nom_complet}.",
            [
                'target_email' => $user->email,
                'target_role' => $user->role,
                'target_region' => $user->region,
            ],
            $user->id
        );

        return response()->json([
            'message' => 'Compte cree. Mot de passe temporaire genere.',
            'user' => (new UserResource($user))->resolve(),
            'temporary_password' => $temporaryPassword,
        ], 201);
    }

    public function show(User $user)
    {
        return new UserResource($user);
    }

    public function update(AdminUpdateUserRequest $request, User $user)
    {
        $before = [
            'role' => $user->role,
            'statut' => $user->statut,
            'region' => $user->region,
            'email' => $user->email,
        ];

        $user->update($request->validated());

        if ($request->statut === 'suspendu') {
            $user->update(['actif' => false]);
        }

        if ($request->statut === 'actif') {
            $user->update(['actif' => true]);
        }

        $fresh = $user->fresh();

        AuditLogger::record(
            $request,
            'user_updated',
            'Utilisateurs',
            "Mise a jour du compte {$fresh->nom_complet}.",
            [
                'before' => $before,
                'after' => [
                    'role' => $fresh->role,
                    'statut' => $fresh->statut,
                    'region' => $fresh->region,
                    'email' => $fresh->email,
                ],
            ],
            $fresh->id
        );

        if ($before['statut'] !== 'suspendu' && $fresh->statut === 'suspendu') {
            AuditLogger::record(
                $request,
                'user_suspended',
                'Utilisateurs',
                "Suspension du compte {$fresh->nom_complet} via edition.",
                ['target_email' => $fresh->email],
                $fresh->id
            );
        }

        if ($before['statut'] !== 'actif' && $fresh->statut === 'actif') {
            AuditLogger::record(
                $request,
                'user_reactivated',
                'Utilisateurs',
                "Reactivation du compte {$fresh->nom_complet} via edition.",
                ['target_email' => $fresh->email],
                $fresh->id
            );
        }

        return new UserResource($fresh);
    }

    public function suspend(Request $request, User $user)
    {
        $user->update(['statut' => 'suspendu', 'actif' => false]);

        AuditLogger::record(
            $request,
            'user_suspended',
            'Utilisateurs',
            "Suspension du compte {$user->nom_complet}.",
            ['target_email' => $user->email],
            $user->id
        );

        return response()->json([
            'message' => 'Compte suspendu.',
            'user' => (new UserResource($user->fresh()))->resolve(),
        ]);
    }

    public function reactivate(Request $request, User $user)
    {
        $user->update([
            'statut' => $user->must_change_password ? 'en_attente_activation' : 'actif',
            'actif' => !$user->must_change_password,
        ]);

        AuditLogger::record(
            $request,
            'user_reactivated',
            'Utilisateurs',
            "Reactivation du compte {$user->nom_complet}.",
            ['target_email' => $user->email],
            $user->id
        );

        return response()->json([
            'message' => 'Compte reactive.',
            'user' => (new UserResource($user->fresh()))->resolve(),
        ]);
    }

    public function resetPassword(Request $request, User $user, TemporaryPasswordService $passwords)
    {
        $temporaryPassword = $passwords->generate();

        $user->update([
            'password' => $temporaryPassword,
            'statut' => 'en_attente_activation',
            'actif' => false,
            'must_change_password' => true,
            'temporary_password_generated_at' => now(),
        ]);

        AuditLogger::record(
            $request,
            'password_reset',
            'Utilisateurs',
            "Reinitialisation admin du mot de passe pour {$user->nom_complet}.",
            ['target_email' => $user->email],
            $user->id
        );

        return response()->json([
            'message' => 'Mot de passe temporaire regenere.',
            'temporary_password' => $temporaryPassword,
            'user' => (new UserResource($user->fresh()))->resolve(),
        ]);
    }

    public function themes()
    {
        return ThemeResource::collection(Theme::with('formations')->get());
    }

    public function formations()
    {
        return FormationResource::collection(Formation::with('theme')->get());
    }

    public function mailSetting()
    {
        $setting = MailSetting::latest('updated_at')->first()
            ?: MailSetting::create([
                'sender_name' => 'OFPPT Formation',
                'sender_email' => 'ilyassbouhida6@gmail.com',
                'is_active' => false,
            ]);

        return response()->json([
            'id' => $setting->id,
            'sender_name' => $setting->sender_name,
            'sender_email' => $setting->sender_email,
            'app_password' => '********',
            'is_active' => (bool) $setting->is_active,
        ]);
    }

    public function updateMailSetting(MailSettingRequest $request)
    {
        $setting = MailSetting::latest('updated_at')->first() ?: new MailSetting();

        $setting->fill([
            'sender_name' => $request->sender_name,
            'sender_email' => $request->sender_email,
            'is_active' => $request->boolean('is_active'),
            'updated_by' => $request->user()->id,
        ]);

        if ($request->filled('app_password')) {
            $setting->app_password = $request->app_password;
        }

        $setting->save();

        AuditLogger::record(
            $request,
            'mail_settings_updated',
            'Configuration Email',
            'Mise a jour des parametres SMTP.',
            [
                'sender_name' => $setting->sender_name,
                'sender_email' => $setting->sender_email,
                'is_active' => (bool) $setting->is_active,
                'password_updated' => $request->filled('app_password'),
            ]
        );

        return response()->json([
            'message' => 'Parametres email enregistres.',
            'setting' => [
                'id' => $setting->id,
                'sender_name' => $setting->sender_name,
                'sender_email' => $setting->sender_email,
                'app_password' => '********',
                'is_active' => (bool) $setting->is_active,
            ],
        ]);
    }

    public function auditLogs(Request $request)
    {
        $request->validate([
            'action' => ['nullable', 'string', 'max:120'],
            'module' => ['nullable', 'string', 'max:120'],
            'role' => ['nullable', 'string', 'max:120'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'date_debut' => ['nullable', 'date'],
            'date_fin' => ['nullable', 'date', 'after_or_equal:date_debut'],
            'search' => ['nullable', 'string', 'max:200'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:200'],
        ]);

        $limit = (int) ($request->input('limit', 50));

        $logs = AuditLog::query()
            ->with('user:id,nom,prenom,email,role')
            ->when($request->filled('action'), fn ($query) => $query->where('action', $request->string('action')->toString()))
            ->when($request->filled('module'), fn ($query) => $query->where('module', $request->string('module')->toString()))
            ->when($request->filled('role'), fn ($query) => $query->where('actor_role', $request->string('role')->toString()))
            ->when($request->filled('user_id'), fn ($query) => $query->where('user_id', (int) $request->input('user_id')))
            ->when($request->filled('date_debut'), fn ($query) => $query->whereDate('created_at', '>=', $request->date('date_debut')->toDateString()))
            ->when($request->filled('date_fin'), fn ($query) => $query->whereDate('created_at', '<=', $request->date('date_fin')->toDateString()))
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = '%' . $request->string('search')->toString() . '%';
                $query->where(function ($q) use ($search) {
                    $q->where('action', 'like', $search)
                        ->orWhere('module', 'like', $search)
                        ->orWhere('description', 'like', $search)
                        ->orWhere('actor_name', 'like', $search)
                        ->orWhere('actor_role', 'like', $search);
                });
            })
            ->latest('id')
            ->limit($limit)
            ->get();

        return response()->json($logs->map(fn (AuditLog $log) => [
            'id' => $log->id,
            'user_id' => $log->user_id,
            'user' => $log->user ? [
                'id' => $log->user->id,
                'nom_complet' => $log->user->nom_complet,
                'email' => $log->user->email,
                'role' => $log->user->role,
            ] : null,
            'actor_name' => $log->actor_name,
            'actor_role' => $log->actor_role,
            'action' => $log->action,
            'module' => $log->module,
            'description' => $log->description,
            'ip_address' => $log->ip_address,
            'user_agent' => $log->user_agent,
            'metadata' => $log->metadata,
            'created_at' => optional($log->created_at)->toISOString(),
            'updated_at' => optional($log->updated_at)->toISOString(),
        ]));
    }

    public function systemAnomalies(Request $request)
    {
        $anomalies = [];

        $push = static function (array &$bucket, string $type, string $module, string $title, int $count, string $message): void {
            if ($count <= 0) {
                return;
            }

            $bucket[] = [
                'type' => $type,
                'module' => $module,
                'title' => $title,
                'count' => $count,
                'message' => $message,
            ];
        };

        $activeWithoutVerified = User::where('statut', 'actif')->whereNull('email_verified_at')->count();
        $pendingOlderThanWeek = User::where('statut', 'en_attente_activation')->where('created_at', '<', now()->subDays(7))->count();
        $suspendedUsers = User::where('statut', 'suspendu')->count();

        $sessionsWithoutLocation = SessionFormation::query()
            ->where('type_session', 'presentielle')
            ->where(function ($query) {
                $query->whereNull('lieu')->orWhere('lieu', '')
                    ->orWhereNull('salle')->orWhere('salle', '');
            })
            ->count();

        $sessionsWithoutAnimateur = SessionFormation::query()
            ->where(function ($query) {
                $query->whereNull('animateur_id')->orWhereDoesntHave('animateur');
            })
            ->count();

        $sessionsWithoutParticipants = SessionFormation::doesntHave('participations')->count();
        $validatedPlansWithoutLines = PlanFormation::where('statut', 'valide')->doesntHave('lignesPlanFormation')->count();

        $invalidHebergements = Hebergement::query()
            ->leftJoin('participations', function ($join) {
                $join->on('participations.session_formation_id', '=', 'hebergements.session_formation_id')
                    ->on('participations.participant_id', '=', 'hebergements.participant_id');
            })
            ->whereNull('participations.id')
            ->count();

        $missingDocuments = Document::query()
            ->get(['id', 'file_path'])
            ->filter(function (Document $document) {
                $path = ltrim((string) $document->file_path, '/');
                if ($path === '') {
                    return true;
                }

                return !Storage::disk('public')->exists($path)
                    && !Storage::exists($path)
                    && !file_exists(storage_path('app/public/' . $path));
            })
            ->count();

        $push($anomalies, 'warning', 'Utilisateurs', 'Comptes actifs sans email verifie', $activeWithoutVerified, "{$activeWithoutVerified} compte(s) actif(s) sans verification email.");
        $push($anomalies, 'warning', 'Utilisateurs', 'Comptes en attente depuis plus de 7 jours', $pendingOlderThanWeek, "{$pendingOlderThanWeek} compte(s) necessitent une verification.");
        $push($anomalies, 'info', 'Utilisateurs', 'Comptes suspendus', $suspendedUsers, "{$suspendedUsers} compte(s) sont actuellement suspendus.");
        $push($anomalies, 'critical', 'Sessions', 'Sessions presentielles incompletes', $sessionsWithoutLocation, "{$sessionsWithoutLocation} session(s) presentielle(s) sans lieu ou salle.");
        $push($anomalies, 'critical', 'Sessions', 'Sessions sans animateur', $sessionsWithoutAnimateur, "{$sessionsWithoutAnimateur} session(s) sans animateur assigne.");
        $push($anomalies, 'warning', 'Sessions', 'Sessions sans participants', $sessionsWithoutParticipants, "{$sessionsWithoutParticipants} session(s) sans participants inscrits.");
        $push($anomalies, 'critical', 'Plans', 'Plans valides sans lignes', $validatedPlansWithoutLines, "{$validatedPlansWithoutLines} plan(s) valide(s) ne contiennent aucune ligne.");
        $push($anomalies, 'critical', 'Hebergements', 'Hebergements incoherents', $invalidHebergements, "{$invalidHebergements} enregistrement(s) d hebergement sans participation associee.");
        $push($anomalies, 'warning', 'Documents', 'Fichiers manquants en stockage', $missingDocuments, "{$missingDocuments} document(s) referencent un fichier introuvable.");

        return response()->json($anomalies);
    }
}
