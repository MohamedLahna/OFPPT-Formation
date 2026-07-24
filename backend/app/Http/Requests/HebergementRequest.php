<?php
namespace App\Http\Requests;
use Illuminate\Foundation\Http\FormRequest;
class HebergementRequest extends FormRequest { public function authorize(): bool { return true; } public function rules(): array { return ['participant_id'=>['required','exists:users,id'],'hotel'=>['nullable','string','max:190'],'adresse'=>['nullable','string','max:190'],'date_arrivee'=>['nullable','date'],'date_depart'=>['nullable','date','after_or_equal:date_arrivee'],'statut'=>['nullable','string','max:80']]; } }