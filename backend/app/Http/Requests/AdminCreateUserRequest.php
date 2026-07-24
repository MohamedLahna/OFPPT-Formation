<?php
namespace App\Http\Requests;
use App\Models\User;
use App\Support\MoroccanRegions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
class AdminCreateUserRequest extends FormRequest { public function authorize(): bool { return true; } public function rules(): array { return ['nom'=>['required','string','max:120'],'prenom'=>['required','string','max:120'],'email'=>['required','email','max:190','unique:users,email'],'role'=>['required',Rule::in(array_values(array_filter(User::ROLES, fn($role)=>$role!=='administrateur')))],'region'=>['nullable',Rule::in(MoroccanRegions::VALUES)]]; } public function withValidator($validator): void { $validator->after(function($validator){ if($this->input('role')==='responsable_dr' && !$this->filled('region')) $validator->errors()->add('region','La region est requise pour un responsable DR.'); }); } }
