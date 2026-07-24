<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EvaluationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $participation = $this->participation;
        $session = $participation?->sessionFormation;
        $participant = $participation?->participant;

        return [
            'id' => $this->id,
            'participation_id' => $this->participation_id,
            'note' => $this->note,
            'satisfaction' => $this->satisfaction,
            'commentaire' => $this->commentaire,
            'competences_acquises' => $this->competences_acquises,
            'date_evaluation' => optional($this->date_evaluation)->toDateTimeString(),
            'participant' => $participant ? [
                'id' => $participant->id,
                'nom_complet' => $participant->nom_complet,
                'email' => $participant->email,
            ] : null,
            'session' => $session ? [
                'id' => $session->id,
                'formation' => $session->formation?->titre,
                'date_session' => optional($session->date_session)->toDateString(),
                'type_session' => $session->type_session,
                'ville' => $session->ville,
                'region' => $session->region,
                'statut' => $session->statut,
                'is_finished' => (bool) $session->is_finished || $session->statut === 'terminee',
                'finished_at' => optional($session->finished_at)->toDateTimeString(),
                'animateur' => $session->animateur?->nom_complet,
            ] : null,
        ];
    }
}
