<?php
namespace App\Http\Requests;
use Illuminate\Foundation\Http\FormRequest;
class PlanRequest extends FormRequest { public function authorize(): bool { return true; } public function rules(): array { return ['titre'=>['required','string','max:190'],'annee'=>['required','integer','min:2020'],'periode_debut'=>['required','date'],'periode_fin'=>['required','date','after_or_equal:periode_debut'],'objectif_general'=>['required','string'],'description'=>['required','string']]; } }
