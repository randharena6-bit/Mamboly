import { AlertTriangle } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { cn } from '../../lib/cn';
import { Button } from './button';

/**
 * Dialogue de confirmation.
 *
 * `role="dialog"` + `aria-modal`, fermeture par Échap ou clic sur le voile, et
 * piège de focus : le bouton d'annulation prend le focus à l'ouverture et le
 * focus revient au déclencheur à la fermeture. Une suppression engage une
 * opération irréversible : pendant l'envoi, le dialogue reste verrouillé.
 */
export function ConfirmDialog({
    open,
    title,
    description,
    confirmLabel = 'Confirmer',
    cancelLabel = 'Annuler',
    variant = 'danger',
    busy = false,
    onConfirm,
    onCancel,
}: {
    open: boolean;
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'primary';
    busy?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    const cancelRef = useRef<HTMLButtonElement>(null);
    const confirmRef = useRef<HTMLButtonElement>(null);
    const previousFocus = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!open) return undefined;

        previousFocus.current = document.activeElement as HTMLElement | null;
        cancelRef.current?.focus();

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                if (!busy) onCancel();
                return;
            }

            if (event.key !== 'Tab') return;

            const first = cancelRef.current;
            const last = confirmRef.current;
            if (first === null || last === null) return;

            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('keydown', onKeyDown);
            previousFocus.current?.focus();
        };
    }, [open, busy, onCancel]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
                type="button"
                aria-label="Fermer la fenêtre"
                disabled={busy}
                onClick={onCancel}
                className="absolute inset-0 cursor-default bg-ink-900/45 backdrop-blur-[2px]"
            />

            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
                aria-describedby={description ? 'confirm-dialog-description' : undefined}
                className="relative w-full max-w-md rounded-2xl border border-ink-100 bg-white p-5 shadow-lift"
            >
                <div className="flex items-start gap-3">
                    <span
                        aria-hidden="true"
                        className={cn(
                            'grid size-10 shrink-0 place-items-center rounded-xl',
                            variant === 'danger'
                                ? 'bg-red-50 text-red-600 ring-1 ring-red-100'
                                : 'bg-brand-50 text-brand-700 ring-1 ring-brand-100',
                        )}
                    >
                        <AlertTriangle className="size-5" />
                    </span>

                    <div className="min-w-0">
                        <h2 id="confirm-dialog-title" className="font-display text-base font-bold text-ink-900">
                            {title}
                        </h2>
                        {description && (
                            <p id="confirm-dialog-description" className="mt-1.5 text-sm leading-relaxed text-ink-500">
                                {description}
                            </p>
                        )}
                    </div>
                </div>

                <div className="mt-5 flex justify-end gap-2">
                    <Button ref={cancelRef} type="button" variant="outline" size="sm" disabled={busy} onClick={onCancel}>
                        {cancelLabel}
                    </Button>
                    <Button
                        ref={confirmRef}
                        type="button"
                        variant="primary"
                        size="sm"
                        disabled={busy}
                        onClick={onConfirm}
                        className={variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : undefined}
                    >
                        {busy ? 'En cours…' : confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}
