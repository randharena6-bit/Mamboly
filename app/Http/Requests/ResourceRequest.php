<?php

namespace App\Http\Requests;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Unique;

/**
 * Base des requêtes de ressource.
 *
 * Un même formulaire sert à la création et à la mise à jour : sur `PUT`/`PATCH`
 * les champs obligatoires deviennent facultatifs, et les règles d'unicité
 * ignorent l'enregistrement courant. L'autorisation s'appuie sur la policy du
 * modèle (`create` ou `update`), jamais sur une décision du client.
 */
abstract class ResourceRequest extends FormRequest
{
    /** Nom du paramètre de route portant le modèle (ex. « plot »). */
    protected string $routeParameter = '';

    /** @return class-string<Model> */
    abstract protected function modelClass(): string;

    /** @return array<string, mixed> */
    abstract protected function baseRules(): array;

    public function authorize(): bool
    {
        $user = $this->user();

        if ($user === null) {
            return false;
        }

        $model = $this->routeModel();

        if ($model !== null) {
            return $user->can('update', $model);
        }

        return $user->can('create', $this->modelClass());
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return $this->isUpdate() ? $this->optionalize($this->baseRules()) : $this->baseRules();
    }

    protected function isUpdate(): bool
    {
        return $this->isMethod('PUT') || $this->isMethod('PATCH');
    }

    protected function routeModel(): ?Model
    {
        $value = $this->route($this->routeParameter);

        return $value instanceof Model ? $value : null;
    }

    /** Exploitation courante (porte d'unicité par exploitation). */
    protected function farmId(): ?int
    {
        return $this->user()?->farm_id;
    }

    /** Règle d'unicité bornée à l'exploitation de l'utilisateur. */
    protected function uniquePerFarm(string $table, string $column): Unique
    {
        $rule = Rule::unique($table, $column)->where('farm_id', $this->farmId());

        $model = $this->routeModel();

        if ($model !== null) {
            $rule->ignore($model->getKey());
        }

        return $rule;
    }

    /**
     * Transforme les « required » en « sometimes » pour une mise à jour partielle.
     *
     * @param  array<string, mixed>  $rules
     * @return array<string, mixed>
     */
    protected function optionalize(array $rules): array
    {
        foreach ($rules as $field => $fieldRules) {
            if (is_array($fieldRules)) {
                $rules[$field] = array_map(
                    fn ($rule) => $rule === 'required' ? 'sometimes' : $rule,
                    $fieldRules,
                );
            } elseif (is_string($fieldRules)) {
                $rules[$field] = preg_replace('/\brequired\b/', 'sometimes', $fieldRules, 1);
            }
        }

        return $rules;
    }
}
