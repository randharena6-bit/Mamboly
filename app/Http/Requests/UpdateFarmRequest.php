<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateFarmRequest extends FormRequest
{
    public function authorize(): bool
    {
        $farm = $this->route('farm');
        return $this->user()?->can('update', $farm) ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $farm = $this->route('farm');

        return [
            'name' => ['sometimes', 'required', 'string', 'max:150', Rule::unique('farms', 'name')->ignore($farm?->id)],
            'location' => ['nullable', 'string', 'max:255'],
            'type' => ['nullable', 'string', 'max:100'],
            'total_area' => ['nullable', 'numeric', 'min:0', 'max:999999.99'],
            'status' => ['nullable', 'in:active,inactive,pending'],
            'manager_id' => ['nullable', 'exists:users,id'],
        ];
    }
}
