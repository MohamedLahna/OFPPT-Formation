<?php
namespace App\Http\Requests;
use App\Models\User;
use App\Support\MoroccanRegions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
class AdminUpdateUserRequest extends FormRequest { public function authorize(): bool { return true; } public function rules(): array { $id=$this->route('user')?->id ?? $this->route('user'); return ['nom'=>['required','string','max:120'],'prenom'=>['required','string','max:120'],'email'=>['required','email','max:190',Rule::unique('users','email')->ignore($id)],'role'=>['required',Rule::in(User::ROLES)],'region'=>['nullable',Rule::in(MoroccanRegions::VALUES)],'statut'=>['required',Rule::in(User::STATUTS)]]; } public function withValidator($validator): void { $validator->after(function($validator){ if($this->input('role')==='responsable_dr' && !$this->filled('region')) $validator->errors()->add('region','La region est requise pour un responsable DR.'); }); } }
