<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AbsenceMessageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'session_formation_id' => $this->session_formation_id,
            'session' => $this->whenLoaded('sessionFormation', fn () => new SessionResource($this->sessionFormation)),
            'participant_id' => $this->participant_id,
            'participant' => $this->whenLoaded('participant', fn () => new UserResource($this->participant)),
            'animateur_id' => $this->animateur_id,
            'animateur' => $this->whenLoaded('animateur', fn () => new UserResource($this->animateur)),
            'absence_id' => $this->absence_id,
            'absence' => $this->whenLoaded('absence', fn () => new AbsenceResource($this->absence)),
            'subject' => $this->subject,
            'message' => $this->message,
            'read_at' => optional($this->read_at)->toISOString(),
            'is_read' => (bool) $this->read_at,
            'created_at' => optional($this->created_at)->toISOString(),
        ];
    }
}
