import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

import { cn } from '../../lib/cn';

/**
 * Fenêtre modale accessible : `role="dialog"`, fermeture par Échap ou clic sur
 * le voile, focus déplacé à l'ouverture et piégé tant qu'elle est ouverte.
 */
export function Modal({
    open,
    title,
    description,
    size = 'md',
    onClose,
    children,
}: {
    open: boolean;
    title: string;
    description?: string;
    size?: 'md' | 'lg';
    onClose: () => void;
    children: ReactNode;
}) {
    const dialogRef = useRef<HTMLDivElement>(null);
    const previousFocus = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!open) return undefined;

        previousFocus.current = document.activeElement as HTMLElement | null;

        const focusables = () =>
            Array.from(
                dialogRef.current?.querySelectorAll<HTMLElement>(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
                ) ?? [],
            ).filter((element) => !element.hasAttribute('disabled'));

        focusables()[0]?.focus();

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
                return;
            }

            if (event.key !== 'Tab') return;

            const elements = focusables();
            if (elements.length === 0) return;

            const first = elements[0];
            const last = elements[elements.length - 1];

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
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
            <button
                type="button"
                aria-label="Fermer la fenêtre"
                onClick={onClose}
                className="absolute inset-0 cursor-default bg-ink-950/50 backdrop-blur-sm"
            />

            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
                aria-describedby={description ? 'modal-description' : undefined}
                className={cn(
                    'relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-ink-100 bg-white shadow-float animate-slide-up sm:rounded-3xl',
                    size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg',
                )}
            >
                <div className="relative flex items-start justify-between gap-4 border-b border-ink-100 bg-gradient-to-r from-brand-50/80 via-white to-water-50/60 px-5 py-4">
                    <div className="min-w-0">
                        <h2 id="modal-title" className="font-display text-base font-bold text-ink-900">
                            {title}
                        </h2>
                        {description && (
                            <p id="modal-description" className="mt-1 text-sm leading-relaxed text-ink-500">
                                {description}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Fermer"
                        className="grid size-9 shrink-0 place-items-center rounded-full border border-ink-200 bg-white/80 text-ink-400 shadow-xs transition-colors hover:border-ink-300 hover:bg-white hover:text-ink-700"
                    >
                        <X aria-hidden="true" className="size-4.5" />
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">{children}</div>
            </div>
        </div>
    );
}
