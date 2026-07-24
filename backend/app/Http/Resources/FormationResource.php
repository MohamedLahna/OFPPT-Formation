<?php
namespace App\Http\Resources;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
class FormationResource extends JsonResource { public function toArray(Request $request): array { return ['id'=>$this->id,'theme_id'=>$this->theme_id,'theme'=>$this->whenLoaded('theme', fn()=>new ThemeResource($this->theme)),'titre'=>$this->titre,'description'=>$this->description,'objectif'=>$this->objectif,'duree'=>$this->duree,'niveau'=>$this->niveau]; } }