<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\AccountEmailChangeCode;
use App\Models\MailSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;

class AccountController extends Controller
{
    private const ICONS = [
        'user',
        'graduation-cap',
        'book-open',
        'calendar',
        'clipboard-list',
        'shield',
        'settings',
        'users',
        'user-check',
        'qrcode',
        'briefcase',
        'star',
        'target',
        'file-text',
        'layers',
        'presentation',
    ];

    private const COLORS = ['purple', 'cyan', 'orange', 'green', 'blue', 'pink'];

    public function profile(Request $request)
    {
        return response()->json(['user' => (new UserResource($request->user()))->resolve()]);
    }

    public function updateProfile(Request $request)
    {
        $data = $request->validate([
            'nom' => ['required', 'string', 'max:255'],
            'prenom' => ['required', 'string', 'max:255'],
        ]);

        $user = $request->user();
        $user->update($data);

        return response()->json([
            'message' => 'Informations mises à jour avec succès.',
            'user' => (new UserResource($user->fresh()))->resolve(),
        ]);
    }

    public function changePassword(Request $request)
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = $request->user();
        if (!Hash::check($data['current_password'], $user->password)) {
            return response()->json([
                'message' => 'Le mot de passe actuel est incorrect.',
                'errors' => ['current_password' => ['Le mot de passe actuel est incorrect.']],
            ], 422);
        }

        $user->forceFill(['password' => $data['password']])->save();

        return response()->json(['message' => 'Mot de passe modifié avec succès.']);
    }

    public function sendEmailCode(Request $request)
    {
        $data = $request->validate([
            'email' => [
                'required',
                'email',
                'max:255',
                'regex:/^[A-Za-z0-9._%+-]+@gmail\.com$/',
                Rule::unique('users', 'email'),
            ],
        ], [
            'email.regex' => 'La nouvelle adresse doit être une adresse Gmail valide.',
            'email.unique' => 'Cette adresse email est déjà utilisée.',
        ]);

        $user = $request->user();
        $code = (string) random_int(100000, 999999);

        $change = DB::transaction(function () use ($user, $data, $code) {
            AccountEmailChangeCode::where('user_id', $user->id)
                ->whereNull('used_at')
                ->update(['used_at' => now()]);

            return AccountEmailChangeCode::create([
                'user_id' => $user->id,
                'pending_email' => $data['email'],
                'code' => Hash::make($code),
                'expires_at' => now()->addMinutes(15),
            ]);
        });

        $setting = MailSetting::where('is_active', true)->latest('updated_at')->first();

        try {
            if ($setting && $setting->getAppPassword()) {
                config([
                    'mail.default' => 'smtp',
                    'mail.mailers.smtp.host' => 'smtp.gmail.com',
                    'mail.mailers.smtp.port' => 587,
                    'mail.mailers.smtp.encryption' => 'tls',
                    'mail.mailers.smtp.username' => $setting->sender_email,
                    'mail.mailers.smtp.password' => $setting->getAppPassword(),
                    'mail.from.address' => $setting->sender_email,
                    'mail.from.name' => $setting->sender_name,
                ]);
            }

            Mail::raw("Bonjour {$user->prenom} {$user->nom},\n\nVotre code de vérification OFPPT est : {$code}\n\nCe code expire dans 15 minutes.", function ($message) use ($change, $setting) {
                $message->to($change->pending_email)
                    ->subject('Code de verification - Modification email OFPPT')
                    ->from($setting?->sender_email ?: config('mail.from.address', 'noreply@ofppt.test'), $setting?->sender_name ?: 'OFPPT Formation');
            });
        } catch (\Throwable $e) {
            Log::warning('Account email change mail failed, code logged for local development.', [
                'error' => $e->getMessage(),
                'user_id' => $user->id,
                'email' => $change->pending_email,
                'code' => $code,
            ]);
        }

        Log::info('Account email change code generated.', ['user_id' => $user->id, 'email' => $change->pending_email, 'code' => $code]);

        return response()->json(['message' => 'Un code de vérification a été envoyé à votre nouvelle adresse Gmail.']);
    }

    public function verifyEmailCode(Request $request)
    {
        $data = $request->validate(['code' => ['required', 'string']]);
        $user = $request->user();

        $change = AccountEmailChangeCode::where('user_id', $user->id)
            ->whereNull('used_at')
            ->latest('id')
            ->first();

        if (!$change) {
            return response()->json(['message' => 'Aucun code actif trouvé.'], 422);
        }

        if ($change->expires_at->isPast()) {
            return response()->json(['message' => 'Code expiré.'], 422);
        }

        if (!Hash::check($data['code'], $change->code)) {
            return response()->json(['message' => 'Code incorrect.'], 422);
        }

        DB::transaction(function () use ($user, $change) {
            $user->forceFill([
                'email' => $change->pending_email,
                'email_verified_at' => now(),
            ])->save();

            $change->update(['used_at' => now()]);
        });

        return response()->json([
            'message' => 'Adresse email modifiée avec succès.',
            'user' => (new UserResource($user->fresh()))->resolve(),
        ]);
    }

    public function updateAvatar(Request $request)
    {
        $data = $request->validate([
            'profile_icon' => ['required', Rule::in(self::ICONS)],
            'profile_color' => ['required', Rule::in(self::COLORS)],
        ]);

        $user = $request->user();
        $user->update($data);

        return response()->json([
            'message' => 'Icône de profil mise à jour avec succès.',
            'user' => (new UserResource($user->fresh()))->resolve(),
        ]);
    }
}
