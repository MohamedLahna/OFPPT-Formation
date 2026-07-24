<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Http\Requests\ChangePasswordRequest;
use App\Http\Requests\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
class AuthController extends Controller
{
    private function needsActivation(User $user): bool { return $user->statut==='en_attente_activation' || $user->must_change_password || !$user->actif; }
    public function login(LoginRequest $request){ $user=User::where('email',$request->email)->first(); if(!$user||!Hash::check($request->password,$user->password)) return response()->json(['message'=>'Email ou mot de passe incorrect.'],401); if($user->statut==='suspendu') return response()->json(['message'=>'Compte suspendu.'],403); if($user->statut==='actif'&&!$user->actif) return response()->json(['message'=>'Compte inactif.'],403); $user->forceFill(['last_login_at'=>now()])->save(); $needs=$this->needsActivation($user); return response()->json(['token'=>$user->createToken('api-token')->plainTextToken,'user'=>(new UserResource($user))->resolve(),'must_change_password'=>(bool)$user->must_change_password,'needs_activation'=>$needs]); }
    public function logout(Request $request){ $request->user()->currentAccessToken()?->delete(); return response()->json(['message'=>'Deconnexion reussie.']); }
    public function me(Request $request){ return response()->json(['user'=>(new UserResource($request->user()))->resolve(),'must_change_password'=>(bool)$request->user()->must_change_password,'needs_activation'=>$this->needsActivation($request->user())]); }
    public function changePassword(ChangePasswordRequest $request){ $user=$request->user(); if($user->statut==='suspendu') return response()->json(['message'=>'Compte suspendu.'],403); if($this->needsActivation($user)) return response()->json(['message'=>'Activation par code Gmail requise.'],403); $user->forceFill(['password'=>$request->password])->save(); return response()->json(['message'=>'Mot de passe change avec succes.','user'=>(new UserResource($user->fresh()))->resolve(),'must_change_password'=>false,'needs_activation'=>false]); }
}
