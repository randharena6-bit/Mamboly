import { CircleAlert, Inbox, RefreshCw } from 'lucide-react';
import type { ComponentType, CSSProperties, ReactNode } from 'react';

import { cn } from '../../lib/cn';
import { Button } from '../ui/button';

/* ------------------------------------------------------------------ */
/* Squelettes de chargement                                            */
/* ------------------------------------------------------------------ */

export function Skeleton({ className }: { className?: string }) {
    return (
        <span
            aria-hidden="true"
            className={cn('block animate-pulse rounded-md bg-ink-100', className)}
        />
    );
}

export function ShimmerBar({ className, style }: { className?: string; style?: CSSProperties }) {
    return (
        <span aria-hidden="true" style={style} className={cn('relative block overflow-hidden rounded-md bg-ink-100', className)}>
            <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/70 to-transparent motion-reduce:animate-none" />
        </span>
    );
}

/** Bandeau « Chargement des données » accessible. */
export function LoadingState({ label = 'Chargement des données…' }: { label?: string }) {
    return (
        <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-3 rounded-xl border border-dashed border-ink-200 bg-ink-50/60 px-4 py-3 text-sm text-ink-600"
        >
            <RefreshCw aria-hidden="true" className="size-4 animate-spin text-brand-600 motion-reduce:animate-none" />
            <span>{label}</span>
        </div>
    );
}

export function StatCardSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn('rounded-2xl border border-ink-100 bg-white p-4 shadow-soft', className)}>
            <Skeleton className="size-9 rounded-xl" />
            <Skeleton className="mt-3 h-3 w-20" />
            <Skeleton className="mt-2 h-5 w-24" />
        </div>
    );
}

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
    return (
        <div role="status" aria-live="polite" className="space-y-2.5">
            <span className="sr-only">Chargement de la liste…</span>
            {Array.from({ length: rows }).map((_, index) => (
                <div key={index} className="flex items-center gap-3">
                    <Skeleton className="size-8 shrink-0 rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                        <ShimmerBar className="h-2.5 w-3/5" />
                        <Skeleton className="h-2 w-2/5" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export function ChartSkeleton({ className }: { className?: string }) {
    const heights = [45, 72, 38, 88, 60, 30, 78, 52, 92, 40, 68, 34];

    return (
        <div role="status" aria-live="polite" className={cn('flex h-full w-full items-end gap-2 p-1', className)}>
            <span className="sr-only">Chargement du graphique…</span>
            {heights.map((height, index) => (
                <ShimmerBar
                    key={index}
                    className="flex-1 rounded-t-md"
                    style={{ height: `${height}%` }}
                />
            ))}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* État vide                                                           */
/* ------------------------------------------------------------------ */

export function EmptyState({
    icon: Icon = Inbox,
    title,
    description,
    action,
    className,
}: {
    icon?: typeof Inbox;
    title: string;
    description?: string;
    action?: { label: string; onClick?: () => void; href?: string };
    className?: string;
}) {
    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center rounded-xl border border-dashed border-ink-200 bg-ink-50/40 px-5 py-8 text-center',
                className,
            )}
        >
            <span className="grid size-11 place-items-center rounded-xl bg-white text-ink-400 shadow-soft ring-1 ring-ink-100">
                <Icon aria-hidden="true" className="size-5" />
            </span>
            <p className="mt-3 text-sm font-semibold text-ink-800">{title}</p>
            {description && <p className="mt-1 max-w-56 text-xs leading-relaxed text-ink-500">{description}</p>}
            {action && (
                <Button variant="outline" size="sm" className="mt-4" onClick={action.onClick}>
                    {action.label}
                </Button>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* État d'erreur                                                       */
/* ------------------------------------------------------------------ */

export function ErrorState({
    title = 'Impossible de charger les données',
    description = 'Vérifiez votre connexion, puis réessayez.',
    icon: Icon = CircleAlert,
    onRetry,
    className,
}: {
    title?: string;
    description?: string;
    /** Icône d'état ; par défaut l'alerte, qui convient à un échec de chargement. */
    icon?: ComponentType<{ className?: string }>;
    onRetry?: () => void;
    className?: string;
}) {
    return (
        <div
            role="alert"
            className={cn(
                'flex flex-col items-center justify-center rounded-xl border border-harvest-200 bg-harvest-50 px-5 py-7 text-center',
                className,
            )}
        >
            <span className="grid size-11 place-items-center rounded-xl bg-white text-harvest-700 shadow-soft ring-1 ring-harvest-200">
                <Icon aria-hidden="true" className="size-5" />
            </span>
            <p className="mt-3 text-sm font-semibold text-ink-900">{title}</p>
            <p className="mt-1 max-w-64 text-xs leading-relaxed text-ink-600">{description}</p>
            {onRetry && (
                <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
                    <RefreshCw aria-hidden="true" />
                    Réessayer
                </Button>
            )}
        </div>
    );
}

/**
 * Aiguille l'affichage selon l'état d'une requête : chargement, erreur,
 * jeu de données vide ou contenu.
 */
export function AsyncBoundary({
    status,
    isEmpty,
    errorMessage,
    empty,
    onRetry,
    children,
    loadingLabel,
}: {
    status: 'idle' | 'loading' | 'success' | 'error';
    isEmpty?: boolean;
    errorMessage?: string;
    empty?: ReactNode;
    onRetry?: () => void;
    loadingLabel?: string;
    children: ReactNode;
}) {
    if (status === 'error') {
        return <ErrorState description={errorMessage} onRetry={onRetry} />;
    }

    if (status === 'loading' || status === 'idle') {
        return <LoadingState label={loadingLabel} />;
    }

    if (isEmpty) {
        return <>{empty}</>;
    }

    return <>{children}</>;
}