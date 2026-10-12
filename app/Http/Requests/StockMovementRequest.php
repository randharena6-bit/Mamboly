<?php

namespace App\Http\Requests;

use App\Enums\StockMovementType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Mouvement d'intrant manuel (entrée, sortie, perte, inventaire…).
 *
 * La consommation liée à une activité et la récolte passent par les services
 * métier, pas par ce formulaire.
 */
class StockMovementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->farm_id !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $farmId = $this->user()->farm_id;

        return [
            'input_id' => ['required', 'integer', Rule::exists('inputs', 'id')->where('farm_id', $farmId)],
            'campaign_id' => ['nullable', 'integer', Rule::exists('campaigns', 'id')->where('farm_id', $farmId)],
            'type' => ['required', Rule::enum(StockMovementType::class)],
            'quantity' => ['required', 'numeric', 'min:0.01'],
            'direction' => ['nullable', Rule::in(['entree', 'sortie'])],
            'note' => ['nullable', 'string'],
        ];
    }
}
