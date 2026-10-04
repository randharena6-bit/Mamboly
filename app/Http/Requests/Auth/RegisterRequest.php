<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

/**
 * Validation de la création d'un compte.
 *
 * L'inscription crée toujours une exploitation : le besoin métier est
 * `role_id` (NOT NULL, clé étrangère vers `roles`). `farm_id` reste nullable
 * pour les administrateurs globaux, créés plus tard depuis l'application.
 */
class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'confirmed', Password::defaults()],
            'farm_name' => ['required', 'string', 'max:150', 'unique:farms,name'],
            'location' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return [
            'name' => 'nom complet',
            'email' => 'adresse e-mail',
            'password' => 'mot de passe',
            'farm_name' => "nom de l'exploitation",
            'location' => 'localisation',
            'phone' => 'téléphone',
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'farm_name.unique' => 'Une exploitation porte déjà ce nom. Choisissez-en un autre.',
            'email.unique' => 'Un compte existe déjà avec cette adresse e-mail.',
        ];
    }
}
