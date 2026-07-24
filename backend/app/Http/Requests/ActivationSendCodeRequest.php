<?php
namespace App\Http\Requests;
use Illuminate\Foundation\Http\FormRequest;
class ActivationSendCodeRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array { return ['new_email'=>['required','email','max:190','unique:users,email'],'password'=>['required','string','min:8','confirmed']]; }
}
