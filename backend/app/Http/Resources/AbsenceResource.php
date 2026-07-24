<?php
namespace App\Http\Resources;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
class AbsenceResource extends JsonResource { public function toArray(Request $request): array { return ['id'=>$this->id,'session_formation_id'=>$this->session_formation_id,'session'=>$this->whenLoaded('sessionFormation', fn()=>new SessionResource($this->sessionFormation)),'participant_id'=>$this->participant_id,'participant'=>$this->whenLoaded('participant', fn()=>new UserResource($this->participant)),'date_absence'=>optional($this->date_absence)->toDateString(),'statut'=>$this->statut,'justification'=>$this->justification,'created_by'=>$this->created_by]; } }