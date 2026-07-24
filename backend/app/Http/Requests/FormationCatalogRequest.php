<?php
namespace App\Http\Requests;
use Illuminate\Foundation\Http\FormRequest;
class FormationCatalogRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'theme_id' => ['required','exists:themes,id'],
            'titre' => ['required','string','max:190'],
            'description' => ['required','string'],
            'objectif' => ['required','string'],
            'duree' => ['required','integer','min:1'],
            'niveau' => ['required','string','max:190'],
        ];
    }
}
