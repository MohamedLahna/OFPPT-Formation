<?php

namespace App\Http\Requests;

use App\Support\MoroccanRegions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ligne_plan_formation_id' => ['required', 'exists:lignes_plan_formation,id'],
            'date_session' => ['required', 'date'],
            'type_session' => ['required', Rule::in(['presentielle', 'distance', 'hybride'])],
            'ville' => ['required', 'string', 'max:120'],
            'region' => ['required', Rule::in(MoroccanRegions::VALUES)],
            'lieu' => ['nullable', 'string', 'max:190'],
            'salle' => ['nullable', 'string', 'max:190'],
            'plateforme' => ['nullable', 'string', 'max:190'],
            'lien_visio' => ['nullable', 'string', 'max:190'],
            'animateur_id' => ['required', 'exists:users,id'],
            'participants' => ['required', 'array', 'min:1'],
            'participants.*.id' => ['required', 'exists:users,id'],
            'participants.*.mode_participation' => ['nullable', Rule::in(['presentiel', 'distance'])],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $type = $this->input('type_session');

            if (in_array($type, ['presentielle', 'hybride'], true)) {
                foreach (['lieu', 'salle'] as $field) {
                    if (!$this->filled($field)) {
                        $validator->errors()->add($field, 'Ce champ est requis.');
                    }
                }
            }

            if (in_array($type, ['distance', 'hybride'], true)) {
                foreach (['plateforme', 'lien_visio'] as $field) {
                    if (!$this->filled($field)) {
                        $validator->errors()->add($field, 'Ce champ est requis.');
                    }
                }
            }

            if ($type === 'hybride') {
                foreach ($this->input('participants', []) as $index => $participant) {
                    if (empty($participant['mode_participation'])) {
                        $validator->errors()->add("participants.$index.mode_participation", 'Mode requis pour une session hybride.');
                    }
                }
            }
        });
    }
}
