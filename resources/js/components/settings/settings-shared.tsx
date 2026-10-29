import { AlertCircle, Loader2, Save } from 'lucide-react';
import { useState, type ComponentType, type FormEvent, type ReactNode } from 'react';

import { cn } from '../../lib/cn';
import { HttpError, http } from '../../lib/http';
import { Button } from '../ui/button';
import { useToast } from '../ui/toast';

export function SettingsCard({
    icon: Icon,
    title,
    description,
    children,
    className,
}: {
    icon: ComponentType<{ className?: string }>;
    title: string;
    description: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section className={cn('rounded-2xl border border-ink-100 bg-white p-5 shadow-soft sm:p-6', className)}>
            <header className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                    <Icon aria-hidden="true" className="size-5" />
                </span>
                <div className="min-w-0">
                    <h2 className="font-display text-lg font-bold tracking-tight text-ink-900">{title}</h2>
                    <p className="mt-0.5 text-sm leading-relaxed text-ink-500">{description}</p>
                </div>
            </header>

            <div className="mt-5">{children}</div>
        </section>
    );
}

export function FormNotice({ message }: { message: string }) {
    return (
        <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-3.5 py-3 text-sm text-red-700"
        >
            <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>{message}</span>
        </div>
    );
}

export function Toggle({
    checked,
    onChange,
    label,
    description,
    disabled = false,
}: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
    description?: string;
    disabled?: boolean;
}) {
    return (
        <div
            className={cn(
                'flex items-start justify-between gap-4 rounded-xl border border-ink-200 bg-white p-4',
                disabled && 'opacity-60',
            )}
        >
            <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-900">{label}</p>
                {description && <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{description}</p>}
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={label}
                disabled={disabled}
                onClick={() => onChange(!checked)}
                className={cn(
                    'relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors duration-200',
                    checked ? 'bg-brand-600' : 'bg-ink-200',
                    disabled ? 'cursor-not-allowed' : 'cursor-pointer',
                )}
            >
                <span
                    aria-hidden="true"
                    className={cn(
                        'absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform duration-200',
                        checked && 'translate-x-5',
                    )}
                />
            </button>
        </div>
    );
}

export function SaveButton({ busy, label = 'Enregistrer' }: { busy: boolean; label?: string }) {
    return (
        <Button type="submit" size="sm" disabled={busy}>
            {busy ? (
                <Loader2 aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
            ) : (
                <Save aria-hidden="true" />
            )}
            {busy ? 'Enregistrement…' : label}
        </Button>
    );
}

type SettingsResponse<R> = {
    message: string;
    data: R;
};

export function useSettingsForm<T extends Record<string, unknown>, R = unknown>({
    endpoint,
    initial,
    onSaved,
    resetOnSuccess = false,
}: {
    endpoint: string;
    initial: T;
    onSaved?: (response: SettingsResponse<R>) => void;
    resetOnSuccess?: boolean;
}) {
    const toast = useToast();
    const [values, setValues] = useState<T>(initial);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [notice, setNotice] = useState('');
    const [busy, setBusy] = useState(false);

    const setValue = <K extends keyof T>(key: K, value: T[K]) => {
        setValues((current) => ({ ...current, [key]: value }));
    };

    const submit = async (event?: FormEvent) => {
        event?.preventDefault();

        setBusy(true);
        setErrors({});
        setNotice('');

        try {
            const response = await http.patch<SettingsResponse<R>>(endpoint, values);
            toast.success('Enregistré', response.message);

            if (resetOnSuccess) setValues(initial);

            onSaved?.(response);
        } catch (error) {
            if (error instanceof HttpError) {
                const fieldErrors: Record<string, string> = {};

                for (const [field, messages] of Object.entries(error.errors)) {
                    if (messages?.[0]) fieldErrors[field] = messages[0];
                }

                setErrors(fieldErrors);
                setNotice(
                    Object.keys(fieldErrors).length > 0
                        ? 'Corrigez les champs signalés puis réessayez.'
                        : error.userMessage,
                );
            } else {
                setNotice('Le serveur n’a pas répondu. Vérifiez votre connexion puis réessayez.');
            }
        } finally {
            setBusy(false);
        }
    };

    return { values, setValue, setValues, errors, notice, busy, submit };
}
