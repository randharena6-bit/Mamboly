<?php

namespace App\Http\Requests;

use App\Enums\WaterMovementType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Mouvement d'eau manuel (remplissage, perte, vidange, correction…).
 *
 * La consommation générée par une irrigation ne passe pas par ce formulaire :
 * elle est produite par `IrrigationService`.
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
            'water_source_id' => ['required', 'integer', Rule::exists('water_sources', 'id')->where('farm_id', $this->user()->farm_id)],
            'type' => ['required', Rule::enum(WaterMovementType::class)],
            'quantity' => ['required', 'numeric', 'min:0.01'],
            'direction' => ['nullable', Rule::in(['entree', 'sortie'])],
            'note' => ['nullable', 'string'],
        ];
    }
}
