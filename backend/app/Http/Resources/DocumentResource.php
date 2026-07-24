<?php
namespace App\Http\Resources;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
class DocumentResource extends JsonResource { public function toArray(Request $request): array { return ['id'=>$this->id,'titre'=>$this->titre,'type'=>$this->type,'file_path'=>$this->file_path,'plan_formation_id'=>$this->plan_formation_id,'formation_id'=>$this->formation_id,'session_formation_id'=>$this->session_formation_id,'uploaded_by'=>$this->uploaded_by,'created_at'=>optional($this->created_at)->toISOString()]; } }