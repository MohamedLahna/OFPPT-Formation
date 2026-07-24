<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\BesoinRequest;
use App\Http\Requests\DocumentRequest;
use App\Http\Requests\LignePlanRequest;
use App\Http\Requests\PlanRequest;
use App\Http\Resources\AbsenceResource;
use App\Http\Resources\BesoinResource;
use App\Http\Resources\DocumentResource;
use App\Http\Resources\LignePlanResource;
use App\Http\Resources\PlanResource;
use App\Models\Absence;
use App\Models\BesoinFormation;
use App\Models\Document;
use App\Models\Formation;
use App\Models\LignePlanFormation;
use App\Models\PlanFormation;
use App\Services\AuditLogger;
use Illuminate\Support\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CdcController extends Controller
{
    private function ownPlan(Request $request, PlanFormation $plan): bool { return $plan->responsable_cdc_id === $request->user()->id; }
    private function editable(PlanFormation $plan): bool { return in_array($plan->statut, ['brouillon','a_corriger'], true); }
    private function attachMatchingBesoin(PlanFormation $plan, array $data): array { if(!empty($data['besoin_formation_id'])) return $data; $formation=Formation::find($data['formation_id']); if(!$formation) return $data; $besoin=$plan->besoinsFormation()->where('theme_id',$formation->theme_id)->first(); if($besoin) $data['besoin_formation_id']=$besoin->id; return $data; }
    private function besoinMatchesFormation(PlanFormation $plan, array $data): ?string
    {
        if (empty($data['besoin_formation_id'])) return null;
        $formation = Formation::find($data['formation_id']);
        $besoin = $plan->besoinsFormation()->whereKey($data['besoin_formation_id'])->first();
        if (!$besoin) return 'Besoin hors plan.';
        if ($formation && (int) $besoin->theme_id !== (int) $formation->theme_id) {
            return 'Le besoin choisi doit avoir la meme thematique que la formation.';
        }
        return null;
    }
    private function lineDateWithinPlan(PlanFormation $plan, array $data): ?string
    {
        if (empty($data['periode_souhaitee']) || !$plan->periode_debut || !$plan->periode_fin) return null;
        $lineDate = Carbon::createFromFormat('Y-m-d', $data['periode_souhaitee'])->startOfDay();
        $start = $plan->periode_debut->copy()->startOfDay();
        $end = $plan->periode_fin->copy()->startOfDay();
        if ($lineDate->lt($start) || $lineDate->gt($end)) {
            return 'La periode souhaitee doit etre comprise entre la date de debut et la date de fin du plan.';
        }
        return null;
    }
    public function dashboard(Request $request){ $base=PlanFormation::where('responsable_cdc_id',$request->user()->id); $absenceBase=Absence::whereHas('sessionFormation.lignePlanFormation.planFormation',fn($q)=>$q->where('responsable_cdc_id',$request->user()->id)); return response()->json(['plans_brouillon'=>(clone $base)->where('statut','brouillon')->count(),'plans_en_attente'=>(clone $base)->where('statut','en_attente_validation')->count(),'plans_valides'=>(clone $base)->where('statut','valide')->count(),'plans_a_corriger'=>(clone $base)->where('statut','a_corriger')->count(),'plans_refuses'=>(clone $base)->where('statut','refuse')->count(),'absences'=>(clone $absenceBase)->count()]); }
    public function plans(Request $request){ return PlanResource::collection(PlanFormation::with(['besoinsFormation.theme','lignesPlanFormation.formation.theme'])->where('responsable_cdc_id',$request->user()->id)->latest()->get()); }
    public function absences(Request $request){ return AbsenceResource::collection(Absence::with(['participant','sessionFormation.formation'])->whereHas('sessionFormation.lignePlanFormation.planFormation',fn($q)=>$q->where('responsable_cdc_id',$request->user()->id))->latest('date_absence')->get()); }
    public function createPlan(PlanRequest $request){ $plan=PlanFormation::create($request->validated()+['responsable_cdc_id'=>$request->user()->id,'statut'=>'brouillon']); return (new PlanResource($plan))->response()->setStatusCode(201); }
    public function showPlan(Request $request, PlanFormation $plan){ if(!$this->ownPlan($request,$plan)) return response()->json(['message'=>'Acces interdit.'],403); return new PlanResource($plan->load(['besoinsFormation.theme','lignesPlanFormation.formation.theme','documents'])); }
    public function updatePlan(PlanRequest $request, PlanFormation $plan){ if(!$this->ownPlan($request,$plan)||!$this->editable($plan)) return response()->json(['message'=>'Plan non modifiable.'],403); $plan->update($request->validated()); return new PlanResource($plan->fresh()); }
    public function deletePlan(Request $request, PlanFormation $plan){ if(!$this->ownPlan($request,$plan)||!$this->editable($plan)) return response()->json(['message'=>'Plan non supprimable.'],403); $plan->delete(); return response()->json(['message'=>'Plan supprime.']); }
    public function addBesoin(BesoinRequest $request, PlanFormation $plan){ if(!$this->ownPlan($request,$plan)||!$this->editable($plan)) return response()->json(['message'=>'Plan non modifiable.'],403); $besoin=$plan->besoinsFormation()->create($request->validated()); return (new BesoinResource($besoin->load('theme')))->response()->setStatusCode(201); }
    public function updateBesoin(BesoinRequest $request, BesoinFormation $besoin){ $plan=$besoin->planFormation; if(!$this->ownPlan($request,$plan)||!$this->editable($plan)) return response()->json(['message'=>'Besoin non modifiable.'],403); $besoin->update($request->validated()); return new BesoinResource($besoin->fresh('theme')); }
    public function deleteBesoin(Request $request, BesoinFormation $besoin){ $plan=$besoin->planFormation; if(!$this->ownPlan($request,$plan)||!$this->editable($plan)) return response()->json(['message'=>'Besoin non supprimable.'],403); $besoin->delete(); return response()->json(['message'=>'Besoin supprime.']); }
    public function addLigne(LignePlanRequest $request, PlanFormation $plan){ if(!$this->ownPlan($request,$plan)||!$this->editable($plan)) return response()->json(['message'=>'Plan non modifiable.'],403); $data=$this->attachMatchingBesoin($plan,$request->validated()); if($message=$this->besoinMatchesFormation($plan,$data)) return response()->json(['message'=>$message],422); if($message=$this->lineDateWithinPlan($plan,$data)) return response()->json(['message'=>$message],422); $ligne=DB::transaction(fn()=> $plan->lignesPlanFormation()->create($data)); return (new LignePlanResource($ligne->load('formation.theme')))->response()->setStatusCode(201); }
    public function updateLigne(LignePlanRequest $request, LignePlanFormation $ligne){ $plan=$ligne->planFormation; if(!$this->ownPlan($request,$plan)||!$this->editable($plan)) return response()->json(['message'=>'Ligne non modifiable.'],403); $data=$this->attachMatchingBesoin($plan,$request->validated()); if($message=$this->besoinMatchesFormation($plan,$data)) return response()->json(['message'=>$message],422); if($message=$this->lineDateWithinPlan($plan,$data)) return response()->json(['message'=>$message],422); $ligne->update($data); return new LignePlanResource($ligne->fresh('formation.theme')); }
    public function deleteLigne(Request $request, LignePlanFormation $ligne){ $plan=$ligne->planFormation; if(!$this->ownPlan($request,$plan)||!$this->editable($plan)) return response()->json(['message'=>'Ligne non supprimable.'],403); $ligne->delete(); return response()->json(['message'=>'Ligne supprimee.']); }
    public function uploadDocument(DocumentRequest $request, PlanFormation $plan)
    {
        if(!$this->ownPlan($request,$plan)||!$this->editable($plan)) return response()->json(['message'=>'Document non autorise.'],403);
        $path=$request->file('file')?$request->file('file')->store('documents','public'):($request->file_path?:'documents/demo.txt');
        $document=Document::create(['titre'=>$request->titre,'type'=>$request->type,'file_path'=>$path,'plan_formation_id'=>$plan->id,'uploaded_by'=>$request->user()->id]);

        AuditLogger::record(
            $request,
            'document_uploaded',
            'Documents',
            "Ajout d un document sur le plan {$plan->titre}.",
            [
                'document_id' => $document->id,
                'plan_id' => $plan->id,
                'type' => $document->type,
                'file_path' => $document->file_path,
            ]
        );

        return (new DocumentResource($document))->response()->setStatusCode(201);
    }

    public function submit(Request $request, PlanFormation $plan)
    {
        if(!$this->ownPlan($request,$plan)||!$this->editable($plan)) return response()->json(['message'=>'Plan non soumettable.'],403);
        if($plan->lignesPlanFormation()->count()===0) return response()->json(['message'=>'Le plan doit contenir au moins une formation.'],422);

        DB::transaction(fn()=> $plan->update(['statut'=>'en_attente_validation','date_soumission'=>now()]));

        AuditLogger::record(
            $request,
            'plan_submitted',
            'Plans',
            "Soumission du plan {$plan->titre} pour validation.",
            [
                'plan_id' => $plan->id,
                'statut' => 'en_attente_validation',
            ]
        );

        return response()->json(['message'=>'Plan soumis pour validation.','plan'=>(new PlanResource($plan->fresh()))->resolve()]);
    }
}
