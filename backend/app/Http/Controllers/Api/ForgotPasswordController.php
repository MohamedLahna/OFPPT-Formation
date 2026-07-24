<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ForgotPasswordResetRequest;
use App\Http\Requests\ForgotPasswordSendCodeRequest;
use App\Http\Requests\ForgotPasswordVerifyCodeRequest;
use App\Models\MailSetting;
use App\Models\PasswordResetCode;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class ForgotPasswordController extends Controller
{
    private function sendMail(User $user, string $code): void
    {
        $setting = MailSetting::where('is_active', true)->latest('updated_at')->first();

        try {
            if ($setting && $setting->getAppPassword()) {
                config([
                    'mail.default'=>'smtp',
                    'mail.mailers.smtp.host'=>'smtp.gmail.com',
                    'mail.mailers.smtp.port'=>587,
                    'mail.mailers.smtp.encryption'=>'tls',
                    'mail.mailers.smtp.username'=>$setting->sender_email,
                    'mail.mailers.smtp.password'=>$setting->getAppPassword(),
                    'mail.from.address'=>$setting->sender_email,
                    'mail.from.name'=>$setting->sender_name,
                ]);
            }

            Mail::raw("Bonjour {$user->prenom} {$user->nom},\n\nVotre code de reinitialisation du mot de passe OFPPT est : {$code}\n\nCe code expire dans 15 minutes.", function ($message) use ($user, $setting) {
                $message->to($user->email)
                    ->subject('Code de reinitialisation - Compte OFPPT')
                    ->from($setting?->sender_email ?: config('mail.from.address', 'no-reply@ofppt.local'), $setting?->sender_name ?: 'OFPPT Formation');
            });
        } catch (\Throwable $e) {
            Log::warning('Forgot password mail failed, code logged for local development.', ['error'=>$e->getMessage(), 'email'=>$user->email, 'code'=>$code]);
        }

        Log::info('Password reset code generated.', ['user_id'=>$user->id, 'email'=>$user->email, 'code'=>$code]);
    }

    private function latestValidCode(User $user): ?PasswordResetCode
    {
        return PasswordResetCode::where('user_id', $user->id)->whereNull('used_at')->latest('id')->first();
    }

    public function sendCode(ForgotPasswordSendCodeRequest $request)
    {
        $user = User::where('email', $request->email)->firstOrFail();
        if ($user->statut === 'suspendu') return response()->json(['message'=>'Compte suspendu.'], 403);

        $code = (string) random_int(100000, 999999);
        PasswordResetCode::where('user_id', $user->id)->whereNull('used_at')->update(['used_at'=>now()]);
        PasswordResetCode::create([
            'user_id'=>$user->id,
            'code'=>Hash::make($code),
            'expires_at'=>now()->addMinutes(15),
        ]);

        $this->sendMail($user, $code);
        return response()->json(['message'=>'Code de reinitialisation envoye a votre email.']);
    }

    public function verifyCode(ForgotPasswordVerifyCodeRequest $request)
    {
        $user = User::where('email', $request->email)->firstOrFail();
        $reset = $this->latestValidCode($user);
        if (!$reset) return response()->json(['message'=>'Aucun code actif.'], 422);
        if ($reset->expires_at->isPast()) return response()->json(['message'=>'Code expire, veuillez demander un nouveau code.'], 422);
        if (!Hash::check($request->code, $reset->code)) return response()->json(['message'=>'Code incorrect'], 422);

        return response()->json(['message'=>'Code verifie. Vous pouvez definir un nouveau mot de passe.']);
    }

    public function reset(ForgotPasswordResetRequest $request)
    {
        $user = User::where('email', $request->email)->firstOrFail();
        $reset = $this->latestValidCode($user);
        if (!$reset) return response()->json(['message'=>'Aucun code actif.'], 422);
        if ($reset->expires_at->isPast()) return response()->json(['message'=>'Code expire, veuillez demander un nouveau code.'], 422);
        if (!Hash::check($request->code, $reset->code)) return response()->json(['message'=>'Code incorrect'], 422);

        $user->forceFill(['password'=>$request->password])->save();
        $reset->update(['used_at'=>now()]);
        $user->tokens()->delete();

        AuditLogger::record(
            $request,
            'password_reset',
            'Authentification',
            "Reinitialisation du mot de passe pour {$user->nom_complet}.",
            ['email' => $user->email],
            $user->id
        );

        return response()->json(['message'=>'Mot de passe reinitialise avec succes.']);
    }
}
