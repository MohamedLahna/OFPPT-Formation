<?php
namespace App\Http\Requests;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
class AbsenceRequest extends FormRequest { public function authorize(): bool { return true; } public function rules(): array { return ['date_absence'=>['required','date'],'absences'=>['required','array','min:1'],'absences.*.participant_id'=>['required','exists:users,id'],'absences.*.statut'=>['required',Rule::in(['present','absent','retard','justifie'])],'absences.*.justification'=>['nullable','string']]; } }