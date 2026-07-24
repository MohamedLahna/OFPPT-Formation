<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HebergementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'session_formation_id' => $this->session_formation_id,
            'participant_id' => $this->participant_id,
            'participant' => $this->whenLoaded('participant', fn () => new UserResource($this->participant)),
            'hotel' => $this->hotel,
            'adresse' => $this->adresse,
            'date_arrivee' => optional($this->date_arrivee)->toDateString(),
            'date_depart' => optional($this->date_depart)->toDateString(),
            'statut' => $this->statut,
        ];
    }
}
