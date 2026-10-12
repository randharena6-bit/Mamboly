import { AlertCircle, Loader2, Save, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { HttpError } from '../../lib/http';
import { cn } from '../../lib/cn';
import { Button } from '../ui/button';
import { Field } from '../ui/field';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Textarea } from '../ui/textarea';
import type { Option, OptionSourceKey, ResourceConfig, ResourceRow } from '../../resources/types';

type FormValues = Record<string, unknown>;

type Props<T extends ResourceRow> = {
    config: ResourceConfig<T>;
    mode: 'create' | 'edit';
    initial: T | null;
    options: Partial<Record<OptionSourceKey, Option[]>>;
    onClose: () => void;
    onSubmit: (payload: Record<string, unknown>) => Promise<void>;
};

/**
 * Formulaire générique d'une ressource : champs pilotés par la configuration,
 * validation des champs obligatoires, remontée des erreurs de validation Laravel
 * sous les champs concernés.
 */
export function ResourceForm<T extends ResourceRow>({
    config,
    mode,
    initial,
    options,
    onClose,
    onSubmit,
}: Props<T>) {
    const fields = useMemo(
        () =>
            config.fields.filter((field) => {
                if (mode === 'create' && field.editOnly) return false;
                if (mode === 'edit' && field.createOnly) return false;

                return true;
            }),
        [config.fields, mode],
    );

    const defaultValues = useMemo(() => buildDefaults(fields, mode, initial), [fields, mode, initial]);

    const [topError, setTopError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        setError,
        formState: { errors },
    } = useForm<FormValues>({ defaultValues });

    const submit = handleSubmit(async (values) => {
        setSubmitting(true);
        setTopError(null);

        try {
            await onSubmit(toPayload(fields, values));
        } catch (error) {
            if (error instanceof HttpError) {
                const leftover: string[] = [];

                Object.entries(error.errors).forEach(([key, messages]) => {
                    if (fields.some((field) => field.name === key)) {
                        setError(key, { type: 'server', message: messages[0] });
                    } else {
                        leftover.push(...messages);
                    }
                });

                setTopError(leftover[0] ?? error.userMessage);
            } else {
                setTopError('Le serveur n’a pas répondu. Vérifiez votre connexion puis réessayez.');
            }

            setSubmitting(false);
        }
    });

    return (
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
            {topError && (
                <div
                    role="alert"
                    className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-3.5 py-3 text-sm text-red-700"
                >
                    <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                    <span>{topError}</span>
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
                {fields.map((field) => {
                    const id = `${config.module}-${field.name}`;
                    const error = errors[field.name]?.message as string | undefined;
                    const fieldOptions: Option[] =
                        field.options ?? (field.optionsFrom ? options[field.optionsFrom] ?? [] : []);
                    const required = field.requiredOnCreate ? mode === 'create' : field.required;

                    if (field.type === 'checkbox') {
                        return (
                            <label
                                key={field.name}
                                htmlFor={id}
                                className={cn(
                                    'flex cursor-pointer items-center gap-3 rounded-xl border border-ink-200 bg-white px-3.5 py-3',
                                    field.full && 'sm:col-span-2',
                                )}
                            >
                                <input
                                    id={id}
                                    type="checkbox"
                                    className="size-4 rounded border-ink-300 text-brand-700 focus-visible:ring-2 focus-visible:ring-brand-600/20"
                                    {...register(field.name)}
                                />
                                <span className="text-sm font-medium text-ink-800">{field.label}</span>
                            </label>
                        );
                    }

                    return (
                        <Field
                            key={field.name}
                            id={id}
                            label={field.label}
                            required={required}
                            hint={field.hint}
                            error={error}
                            className={field.full || field.type === 'textarea' ? 'sm:col-span-2' : undefined}
                        >
                            {(describedBy) => {
                                if (field.type === 'select') {
                                    return (
                                        <Select
                                            id={id}
                                            aria-describedby={describedBy}
                                            aria-invalid={error ? true : undefined}
                                            {...register(field.name, {
                                                required: required ? 'Ce champ est obligatoire.' : false,
                                            })}
                                        >
                                            <option value="">
                                                {field.placeholder ?? 'Sélectionner…'}
                                            </option>
                                            {fieldOptions.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </Select>
                                    );
                                }

                                if (field.type === 'textarea') {
                                    return (
                                        <Textarea
                                            id={id}
                                            aria-describedby={describedBy}
                                            aria-invalid={error ? true : undefined}
                                            placeholder={field.placeholder}
                                            {...register(field.name, {
                                                required: required ? 'Ce champ est obligatoire.' : false,
                                            })}
                                        />
                                    );
                                }

                                const inputType =
                                    field.type === 'number'
                                        ? 'number'
                                        : field.type === 'date'
                                          ? 'date'
                                          : field.type === 'datetime'
                                            ? 'datetime-local'
                                            : field.type === 'password'
                                              ? 'password'
                                              : 'text';

                                return (
                                    <Input
                                        id={id}
                                        type={inputType}
                                        inputMode={field.type === 'number' ? 'decimal' : undefined}
                                        step={field.step}
                                        min={field.min}
                                        max={field.max}
                                        aria-describedby={describedBy}
                                        aria-invalid={error ? true : undefined}
                                        placeholder={field.placeholder}
                                        {...register(field.name, {
                                            required: field.required ? 'Ce champ est obligatoire.' : false,
                                        })}
                                    />
                                );
                            }}
                        </Field>
                    );
                })}
            </div>

            <div className="mt-1 flex flex-wrap items-center justify-end gap-2 border-t border-ink-100 pt-4">
                <Button type="button" variant="outline" size="sm" disabled={submitting} onClick={onClose}>
                    <X aria-hidden="true" />
                    Annuler
                </Button>
                <Button type="submit" size="sm" disabled={submitting}>
                    {submitting ? (
                        <Loader2 aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
                    ) : (
                        <Save aria-hidden="true" />
                    )}
                    {submitting ? 'Enregistrement…' : mode === 'create' ? 'Créer' : 'Enregistrer'}
                </Button>
            </div>
        </form>
    );
}

/** Valeurs initiales : valeurs par défaut de la config, écrasées par la ligne éditée. */
function buildDefaults(
    fields: ResourceConfig['fields'],
    mode: 'create' | 'edit',
    initial: ResourceRow | null,
): FormValues {
    const values: FormValues = {};

    for (const field of fields) {
        let value: unknown = field.type === 'checkbox' ? Boolean(field.default) : (field.default ?? '');

        if (mode === 'edit' && initial !== null && initial[field.name] !== undefined) {
            value = normalizeForInput(field.type, initial[field.name]);
        }

        values[field.name] = value;
    }

    return values;
}

/** Adapte une valeur de l'API au contrôle HTML correspondant. */
function normalizeForInput(type: string | undefined, value: unknown): unknown {
    if (value === null || value === undefined) return type === 'checkbox' ? false : '';

    switch (type) {
        case 'checkbox':
            return Boolean(value);
        case 'datetime':
            return typeof value === 'string' ? value.slice(0, 16) : value;
        case 'date':
            return typeof value === 'string' ? value.slice(0, 10) : value;
        default:
            return value;
    }
}

/** Transforme les valeurs du formulaire en corps de requête accepté par l'API. */
function toPayload(fields: ResourceConfig['fields'], values: FormValues): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    for (const field of fields) {
        let value = values[field.name];

        if (field.type === 'checkbox') {
            payload[field.name] = Boolean(value);
            continue;
        }

        // Un mot de passe laissé vide n'est pas transmis : le mot de passe actuel est conservé.
        if (field.type === 'password' && (value === '' || value === undefined || value === null)) {
            continue;
        }

        if (value === '' || value === undefined || value === null) {
            // Un champ facultatif vide n'est pas envoyé : la colonne reste inchangée.
            payload[field.name] = null;
            continue;
        }

        if (field.type === 'number' || field.type === 'select') {
            const asNumber = typeof value === 'string' ? Number(value) : value;

            if (typeof asNumber === 'number' && !Number.isNaN(asNumber)) {
                payload[field.name] = asNumber;
                continue;
            }
        }

        payload[field.name] = value;
    }

    return payload;
}
