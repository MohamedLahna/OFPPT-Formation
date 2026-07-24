<?php
namespace App\Http\Requests;
use Illuminate\Foundation\Http\FormRequest;
class EvaluationRequest extends FormRequest { public function authorize(): bool { return true; } public function rules(): array { return ['note'=>['required','integer','between:1,5'],'satisfaction'=>['nullable','integer','between:1,5'],'commentaire'=>['nullable','string'],'competences_acquises'=>['nullable','string']]; } }