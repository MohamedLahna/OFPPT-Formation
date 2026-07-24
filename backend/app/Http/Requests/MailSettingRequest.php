<?php
namespace App\Http\Requests;
use Illuminate\Foundation\Http\FormRequest;
class MailSettingRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array { return ['sender_name'=>['required','string','max:120'],'sender_email'=>['required','email','regex:/^[A-Za-z0-9._%+\-]+@gmail\.com$/'],'app_password'=>['nullable','string','min:8'],'is_active'=>['required','boolean']]; }
    public function messages(): array { return ['sender_email.regex'=>'Le sender email doit etre une adresse Gmail valide.']; }
}
