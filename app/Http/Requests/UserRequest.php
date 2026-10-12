<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Validation\Rule;

class UserRequest extends ResourceRequest
{
    protected string $routeParameter = 'user';

    protected function modelClass(): string
    {
        return User::class;
    }

    protected function baseRules(): array
    {
        $unique = Rule::unique('users', 'email');

        $user = $this->routeModel();

        if ($user !== null) {
            $unique->ignore($user->getKey());
        }

        $rules = [
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:255', $unique],
            'password' => ['required', 'string', 'min:8'],
            'phone' => ['nullable', 'string', 'max:30'],
            'role_id' => ['required', 'integer', 'exists:roles,id'],
            'is_active' => ['nullable', 'boolean'],
        ];

        // L'administrateur global n'est rattaché à aucune exploitation : il doit
        // préciser celle du compte créé ou modifié.
        if ($this->farmId() === null) {
            $rules['farm_id'] = ['required', 'integer', 'exists:farms,id'];
        }

        return $rules;
    }
}
