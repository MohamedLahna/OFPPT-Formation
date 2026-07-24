<?php
namespace App\Http\Requests;
use Illuminate\Foundation\Http\FormRequest;
class BesoinRequest extends FormRequest { public function authorize(): bool { return true; } public function rules(): array { return ['domaine'=>['required','string','max:190'],'probleme_observe'=>['required','string'],'competence_a_ameliorer'=>['required','string','max:190'],'public_cible'=>['required','string','max:190'],'justification'=>['required','string'],'theme_id'=>['required','exists:themes,id']]; } }
