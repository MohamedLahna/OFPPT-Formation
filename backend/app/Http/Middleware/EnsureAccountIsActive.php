<?php
namespace App\Http\Middleware;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
class EnsureAccountIsActive { public function handle(Request $request, Closure $next): Response { $user=$request->user(); if(!$user) return response()->json(['message'=>'Non authentifie.'],401); if($user->statut==='suspendu') return response()->json(['message'=>'Compte suspendu ou inactif.'],403); if($user->statut==='en_attente_activation'||$user->must_change_password||!$user->actif) return response()->json(['message'=>'Activation du compte requise.','needs_activation'=>true,'must_change_password'=>(bool)$user->must_change_password],403); return $next($request); } }
