<?php

namespace App\Http\Requests\Api;

use App\Enums\WaterMovementType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Mouvement d'eau appliqué à une ressource identifiée par la route.
 */
class WaterMovementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->farm_id !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'type' => ['required', Rule::enum(WaterMovementType::class)],
            'quantity' => ['required', 'numeric', 'min:0.01'],
            'direction' => ['nullable', Rule::in(['entree', 'sortie'])],
            'note' => ['nullable', 'string'],
        ];
    }
}
