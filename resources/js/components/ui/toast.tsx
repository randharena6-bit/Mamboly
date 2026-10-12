import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';

import { cn } from '../../lib/cn';

type ToastTone = 'success' | 'error' | 'info';

type ToastItem = {
    id: number;
    tone: ToastTone;
    title: string;
    description?: string;
};

type ToastContextValue = {
    push: (toast: { tone: ToastTone; title: string; description?: string }) => void;
    success: (title: string, description?: string) => void;
    error: (title: string, description?: string) => void;
    info: (title: string, description?: string) => void;
    dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toneStyles: Record<ToastTone, { icon: typeof Info; className: string }> = {
    success: { icon: CheckCircle2, className: 'text-green-600' },
    error: { icon: XCircle, className: 'text-red-600' },
    info: { icon: Info, className: 'text-water-600' },
};

/**
 * Notifications transitoires.
 *
 * Le conteneur est annoncé aux lecteurs d'écran (`aria-live="polite"`) ; chaque
 * message peut être fermé manuellement et disparaît seul après quelques
 * secondes pour ne pas encombrer l'interface.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const counter = useRef(0);

    const dismiss = useCallback((id: number) => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
    }, []);

    const push = useCallback(
        (toast: { tone: ToastTone; title: string; description?: string }) => {
            counter.current += 1;
            const id = counter.current;
            setToasts((current) => [...current, { id, ...toast }]);
            window.setTimeout(() => dismiss(id), 5200);
        },
        [dismiss],
    );

    const value = useMemo<ToastContextValue>(
        () => ({
            push,
            dismiss,
            success: (title, description) => push({ tone: 'success', title, description }),
            error: (title, description) => push({ tone: 'error', title, description }),
            info: (title, description) => push({ tone: 'info', title, description }),
        }),
        [push, dismiss],
    );

    return (
        <ToastContext.Provider value={value}>
            {children}

            <div
                aria-live="polite"
                aria-atomic="false"
                className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end"
            >
                {toasts.map((toast) => {
                    const { icon: Icon, className } = toneStyles[toast.tone];

                    return (
                        <div
                            key={toast.id}
                            role="status"
                            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-ink-100 bg-white p-3.5 shadow-lift"
                        >
                            <Icon aria-hidden="true" className={cn('mt-0.5 size-5 shrink-0', className)} />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-ink-900">{toast.title}</p>
                                {toast.description && (
                                    <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{toast.description}</p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => dismiss(toast.id)}
                                aria-label="Fermer la notification"
                                className="grid size-6 shrink-0 place-items-center rounded-md text-ink-400 transition-colors hover:bg-ink-50 hover:text-ink-700"
                            >
                                <X aria-hidden="true" className="size-4" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast(): ToastContextValue {
    const context = useContext(ToastContext);

    if (context === null) {
        throw new Error('useToast doit être utilisé dans un ToastProvider.');
    }

    return context;
}
