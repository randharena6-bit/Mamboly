import type { ComponentProps, ReactNode } from 'react';

import { cn } from '../../lib/cn';

/**
 * Champ de formulaire : libellé, saisie et message d'erreur.
 *
 * L'erreur est liée au champ via `aria-describedby` et `aria-invalid` pour
 * qu'elle soit annoncée par les lecteurs d'écran.
 */
export function Input({
    label,
    error,
    hint,
    icon,
    className,
    id,
    ...props
}: Omit<ComponentProps<'input'>, 'id'> & {
    id: string;
    label: string;
    error?: string;
    hint?: ReactNode;
    icon?: ReactNode;
}) {
    const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={id} className="text-sm font-semibold text-ink-800">
                {label}
            </label>

            <div className="relative">
                {icon ? (
                    <span
                        aria-hidden="true"
                        className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-400 [&_svg]:size-4.5"
                    >
                        {icon}
                    </span>
                ) : null}

                <input
                    id={id}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={describedBy}
                    className={cn(
                        'h-11 w-full rounded-xl border bg-white px-3.5 text-[0.9375rem] text-ink-900 shadow-xs transition-colors',
                        'placeholder:text-ink-400',
                        'focus:border-brand-600 focus:ring-3 focus:ring-brand-600/15 focus:outline-none',
                        'disabled:cursor-not-allowed disabled:bg-ink-50',
                        icon && 'pl-10',
                        error ? 'border-red-500 focus:border-red-600 focus:ring-red-600/15' : 'border-ink-200',
                        className,
                    )}
                    {...props}
                />
            </div>

            {error ? (
                <p id={`${id}-error`} role="alert" className="text-xs font-medium text-red-600">
                    {error}
                </p>
            ) : hint ? (
                <p id={`${id}-hint`} className="text-xs text-ink-500">
                    {hint}
                </p>
            ) : null}
        </div>
    );
}
