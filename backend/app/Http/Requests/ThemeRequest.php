<?php
namespace App\Http\Requests;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
class ThemeRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array
    {
        return [
            'nom' => ['required','string','max:190',Rule::unique('themes','nom')],
            'description' => ['required','string'],
        ];
    }
}
