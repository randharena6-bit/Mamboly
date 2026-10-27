import { useId, type ReactNode } from 'react';
import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn';

export type InputProps = Omit<ComponentProps<'input'>, 'size'> & {
    /** Libellé rendu au-dessus du champ. Omis lorsque le champ est déjà enveloppé par `Field`. */
    label?: string;
    /** Aide affichée sous le champ. */
    hint?: string;
    /** Message d'erreur affiché sous le champ. */
    error?: string;
    /** Pictogramme posé à gauche de la valeur. */
    icon?: ReactNode;
    /** Élément posé à droite (unité, action…). */
    trailing?: ReactNode;
    containerClassName?: string;
};

/**
 * Champ de saisie unique pour toute l'application.
 *
 * Il peut être utilisé seul — auquel cas il rend son libellé, son aide et son
 * erreur — ou comme contrôle nu à l'intérieur de `Field`. Dans les deux cas,
 * l'icône et l'unité éventuelles restent alignées avec le texte saisi.
 */
export function Input({
    className,
    containerClassName,
    label,
    hint,
    error,
    icon,
    trailing,
    id,
    ...props
}: InputProps) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const hintId = hint ? `${inputId}-hint` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;
    const describedBy = [props['aria-describedby'], hintId, errorId].filter(Boolean).join(' ') || undefined;

    const control = (
        <div className="relative">
            {icon && (
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 left-3.5 flex -translate-y-1/2 items-center text-ink-400 [&_svg]:size-4"
                >
                    {icon}
                </span>
            )}

            <input
                id={inputId}
                aria-describedby={describedBy}
                aria-invalid={error ? true : props['aria-invalid']}
                className={cn(
                    'flex h-11 w-full rounded-xl border border-ink-200 bg-white px-3.5 text-sm text-ink-900 shadow-xs transition-all outline-none',
                    'placeholder:text-ink-400 hover:border-ink-300',
                    'focus-visible:border-brand-400 focus-visible:ring-4 focus-visible:ring-brand-600/12',
                    'disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400',
                    icon && 'pl-10',
                    trailing && 'pr-10',
                    error && 'border-red-300 focus-visible:border-red-400 focus-visible:ring-red-500/12',
                    className,
                )}
                {...props}
            />

            {trailing && (
                <span className="absolute top-1/2 right-3.5 flex -translate-y-1/2 items-center text-xs font-medium text-ink-400">
                    {trailing}
                </span>
            )}
        </div>
    );

    if (!label && !hint && !error && !containerClassName) return control;

    return (
        <div className={cn('flex flex-col gap-1.5', containerClassName)}>
            {label && (
                <label htmlFor={inputId} className="text-sm font-semibold text-ink-800">
                    {label}
                    {props.required ? (
                        <span className="ml-1 text-red-600" aria-hidden="true">
                            *
                        </span>
                    ) : (
                        <span className="ml-1 text-xs font-normal text-ink-400">(facultatif)</span>
                    )}
                </label>
            )}

            {control}

            {hint && (
                <p id={hintId} className="text-xs text-ink-400">
                    {hint}
                </p>
            )}
            {error && (
                <p id={errorId} role="alert" className="text-xs font-medium text-red-600">
                    {error}
                </p>
            )}
        </div>
    );
}
