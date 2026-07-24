<?php
namespace App\Http\Requests;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
class DocumentRequest extends FormRequest { public function authorize(): bool { return true; } public function rules(): array { return ['titre'=>['required','string','max:190'],'type'=>['nullable',Rule::in(['fiche_besoin','programme','support_cours','exercice','document_pedagogique','autre'])],'file'=>['nullable','file','max:5120','mimes:pdf,doc,docx,ppt,pptx,xls,xlsx,txt'],'file_path'=>['nullable','string','max:255']]; } }