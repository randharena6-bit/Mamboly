import { cn } from '../../lib/cn';

export function LoadingState({ label = 'Chargement des données…' }: { label?: string }) {
    return (
        <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-3 rounded-xl border border-dashed border-ink-200 bg-ink-50/60 px-4 py-3 text-sm text-ink-600"
        >
            <span className="flex h-5 w-5 items-center justify-center">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-200 border-t-brand-700" aria-hidden="true" />
            </span>
            <span>{label}</span>
        </div>
    );
}

export function Skeleton({ className }: { className?: string }) {
    return (
        <span
            aria-hidden="true"
            className={cn('block animate-pulse rounded-md bg-ink-100', className)}
        />
    );
}
