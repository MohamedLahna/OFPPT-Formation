<?php
namespace App\Http\Resources;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
class BesoinResource extends JsonResource { public function toArray(Request $request): array { return ['id'=>$this->id,'plan_formation_id'=>$this->plan_formation_id,'domaine'=>$this->domaine,'probleme_observe'=>$this->probleme_observe,'competence_a_ameliorer'=>$this->competence_a_ameliorer,'public_cible'=>$this->public_cible,'justification'=>$this->justification,'theme_id'=>$this->theme_id,'theme'=>$this->whenLoaded('theme', fn()=>new ThemeResource($this->theme))]; } }