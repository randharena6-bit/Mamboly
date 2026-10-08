<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreFarmRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', \App\Models\Farm::class) ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150', 'unique:farms,name'],
            'location' => ['nullable', 'string', 'max:255'],
            'type' => ['nullable', 'string', 'max:100'],
            'total_area' => ['nullable', 'numeric', 'min:0', 'max:999999.99'],
            'status' => ['nullable', 'in:active,inactive,pending'],
            'manager_id' => ['nullable', 'exists:users,id'],
        ];
    }
}
