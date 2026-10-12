import { CircleAlert, RefreshCw } from 'lucide-react';
import type { ComponentType } from 'react';

import { cn } from '../../lib/cn';
import { Button } from '../ui/button';

export function ErrorState({
    title = 'Impossible de charger les données',
    description = 'Vérifiez votre connexion, puis réessayez.',
    icon: Icon = CircleAlert,
    onRetry,
    className,
}: {
    title?: string;
    description?: string;
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
