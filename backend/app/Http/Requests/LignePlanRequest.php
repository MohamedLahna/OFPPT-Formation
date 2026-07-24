<?php
namespace App\Http\Requests;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
class LignePlanRequest extends FormRequest { public function authorize(): bool { return true; } public function rules(): array { return ['formation_id'=>['required','exists:formations,id'],'besoin_formation_id'=>['nullable','exists:besoins_formation,id'],'priorite'=>['required',Rule::in(['basse','moyenne','haute'])],'public_cible'=>['required','string','max:190'],'nombre_formateurs'=>['required','integer','min:1'],'duree_proposee'=>['nullable','integer','min:1'],'periode_souhaitee'=>['nullable','date_format:Y-m-d'],'remarque'=>['nullable','string'],'hebergement_necessaire'=>['sometimes','boolean'],'nombre_hors_ville'=>['nullable','integer','min:0'],'ville_proposee'=>['nullable','string','max:190'],'remarque_logistique'=>['nullable','string']]; } }
