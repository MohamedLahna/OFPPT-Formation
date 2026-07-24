<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ActivationSendCodeRequest;
use App\Http\Requests\ActivationVerifyCodeRequest;
use App\Http\Resources\UserResource;
use App\Models\AccountActivationCode;
use App\Models\MailSetting;
use App\Services\AuditLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class ActivationController extends Controller
{
    private function ensurePending($user)
    {
        if ($user->statut !== 'en_attente_activation' || !$user->must_change_password) {
            abort(response()->json(['message'=>'Ce compte ne necessite pas d activation.'], 403));
        }
    }

    public function sendCode(ActivationSendCodeRequest $request)
    {
        $user = $request->user();
        $this->ensurePending($user);

        $code = (string) random_int(100000, 999999);
        $setting = MailSetting::where('is_active', true)->latest('updated_at')->first();

        $activation = DB::transaction(function () use ($request, $user, $code) {
            AccountActivationCode::where('user_id', $user->id)->whereNull('used_at')->update(['used_at'=>now()]);
            return AccountActivationCode::create([
                'user_id'=>$user->id,
                'pending_email'=>$request->new_email,
                'pending_password_hash'=>Hash::make($request->password),
                'code'=>Hash::make($code),
                'expires_at'=>now()->addMinutes(15),
            ]);
        });

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

            Mail::raw("Bonjour {$user->prenom} {$user->nom},\n\nVotre code d activation OFPPT est : {$code}\n\nCe code expire dans 15 minutes.", function ($message) use ($activation, $setting) {
                $message->to($activation->pending_email)
                    ->subject('Code de verification - Activation de votre compte OFPPT')
                    ->from($setting?->sender_email ?: config('mail.from.address', 'ilyassbouhida6@gmail.com'), $setting?->sender_name ?: 'OFPPT Formation');
            });
        } catch (\Throwable $e) {
            Log::warning('Activation mail failed, code logged for local development.', ['error'=>$e->getMessage(), 'email'=>$activation->pending_email, 'code'=>$code]);
        }

        Log::info('Activation code generated.', ['user_id'=>$user->id, 'email'=>$activation->pending_email, 'code'=>$code]);
        return response()->json(['message'=>'Code de verification envoye.']);
    }

    public function verifyCode(ActivationVerifyCodeRequest $request)
    {
        $user = $request->user();
        $this->ensurePending($user);

        $activation = AccountActivationCode::where('user_id', $user->id)->whereNull('used_at')->latest('id')->first();
        if (!$activation) return response()->json(['message'=>'Aucun code actif.'], 422);
        if ($activation->expires_at->isPast()) return response()->json(['message'=>'Code expire, veuillez demander un nouveau code.'], 422);
        if (!Hash::check($request->code, $activation->code)) return response()->json(['message'=>'Code incorrect'], 422);

        DB::transaction(function () use ($user, $activation) {
            $user->forceFill([
                'email'=>$activation->pending_email,
                'password'=>$activation->pending_password_hash,
                'email_verified_at'=>now(),
                'statut'=>'actif',
                'actif'=>true,
                'must_change_password'=>false,
            ])->save();
            $activation->update(['used_at'=>now()]);
        });

        AuditLogger::record(
            $request,
            'account_activated',
            'Activation',
            "Activation du compte {$user->nom_complet}.",
            ['email' => $user->email],
            $user->id
        );

        return response()->json(['message'=>'Compte active avec succes.','user'=>(new UserResource($user->fresh()))->resolve(),'needs_activation'=>false]);
    }
}
