<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ForgotPasswordResetRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array { return ['email'=>['required','email','exists:users,email'],'code'=>['required','digits:6'],'password'=>['required','string','min:8','confirmed']]; }
}
