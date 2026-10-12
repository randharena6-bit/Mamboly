import { cn } from '../../lib/cn';
import type { ReactNode } from 'react';

/**
 * Enveloppe d'un champ de formulaire : libellé associé, indicateur de champ
 * obligatoire, aide facultative et message d'erreur relié à `aria-describedby`.
 *
 * `children` peut être une fonction recevant l'identifiant à poser sur le
 * contrôle via `aria-describedby`, afin que le lecteur d'écran annonce l'aide
 * et l'erreur.
 */
export function Field({
    id,
    label,
    required,
    hint,
    error,
    className,
    children,
}: {
    id: string;
    label: string;
    required?: boolean;
    hint?: string;
    error?: string;
    className?: string;
    children: ReactNode | ((describedBy: string | undefined) => ReactNode);
}) {
    const hintId = hint ? `${id}-hint` : undefined;
    const errorId = error ? `${id}-error` : undefined;
    const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

    return (
        <div className={cn('flex flex-col gap-1.5', className)}>
            <label htmlFor={id} className="text-sm font-medium text-ink-800">
                {label}
                {required ? (
                    <span className="ml-1 text-red-600" aria-hidden="true">
                        *
                    </span>
                ) : (
                    <span className="ml-1 text-xs font-normal text-ink-400">(facultatif)</span>
                )}
            </label>

            {typeof children === 'function' ? children(describedBy) : children}

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
