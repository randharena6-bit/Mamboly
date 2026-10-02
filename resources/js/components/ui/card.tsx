import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn';

export function Card({ className, ...props }: ComponentProps<'div'>) {
    return (
        <div
            data-slot="card"
            className={cn(
                'rounded-2xl border border-ink-100/90 bg-white shadow-soft',
                className,
            )}
            {...props}
        />
    );
}

export function CardHeader({ className, ...props }: ComponentProps<'div'>) {
    return (
        <div
            data-slot="card-header"
            className={cn('flex flex-col gap-1 px-5 pt-5', className)}
            {...props}
        />
    );
}

export function CardTitle({ className, ...props }: ComponentProps<'h3'>) {
    return (
        <h3
            data-slot="card-title"
            className={cn('font-display text-base font-bold tracking-tight text-ink-900', className)}
            {...props}
        />
    );
}

export function CardDescription({ className, ...props }: ComponentProps<'p'>) {
    return (
        <p
            data-slot="card-description"
            className={cn('text-sm leading-relaxed text-ink-500', className)}
            {...props}
        />
    );
}

export function CardContent({ className, ...props }: ComponentProps<'div'>) {
    return (
        <div data-slot="card-content" className={cn('px-5 pb-5', className)} {...props} />
    );
}

export function CardFooter({ className, ...props }: ComponentProps<'div'>) {
    return (
        <div
            data-slot="card-footer"
            className={cn('flex items-center gap-3 px-5 pb-5', className)}
            {...props}
        />
    );
}