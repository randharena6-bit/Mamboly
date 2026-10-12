import type { ComponentProps, ReactNode } from 'react';

import { cn } from '../../lib/cn';

export function Card({ className, ...props }: ComponentProps<'div'>) {
    return (
        <div
            className={cn(
                'rounded-2xl border border-ink-100 bg-white shadow-soft transition-shadow hover:shadow-card',
                className,
            )}
            {...props}
        />
    );
}

export function CardHeader({
    title,
    subtitle,
    action,
    className,
}: {
    title: string;
    subtitle?: string;
    action?: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6', className)}>
            <div className="min-w-0">
                <h2 className="font-display text-base font-semibold tracking-tight text-ink-900 sm:text-lg">
                    {title}
                </h2>
                {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
            </div>
            {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </div>
    );
}

export function CardContent({ className, ...props }: ComponentProps<'div'>) {
    return <div className={cn('p-5 pt-0 sm:px-6 sm:pb-6', className)} {...props} />;
}
