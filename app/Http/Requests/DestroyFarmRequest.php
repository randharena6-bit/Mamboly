<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class DestroyFarmRequest extends FormRequest
{
    public function authorize(): bool
    {
        $farm = $this->route('farm');
        return $this->user()?->can('delete', $farm) ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [];
    }
}
