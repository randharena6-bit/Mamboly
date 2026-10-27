import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn';

export function Card({ className, ...props }: ComponentProps<'div'>) {
    return (
        <div
            className={cn(
                'surface rounded-2xl transition-shadow duration-300 hover:shadow-card',
                className,
            )}
            {...props}
        />
    );
}

export function CardHeader({ className, ...props }: ComponentProps<'div'>) {
    return <div className={cn('flex flex-col gap-1.5 p-5 sm:p-6', className)} {...props} />;
}

export function CardTitle({ className, ...props }: ComponentProps<'h2'>) {
    return (
        <h2
            className={cn(
                'font-display text-base font-bold tracking-tight text-ink-900 sm:text-lg',
                className,
            )}
            {...props}
        />
    );
}

export function CardDescription({ className, ...props }: ComponentProps<'p'>) {
    return <p className={cn('text-sm leading-relaxed text-ink-500', className)} {...props} />;
}

export function CardContent({ className, ...props }: ComponentProps<'div'>) {
    return <div className={cn('p-5 pt-0 sm:px-6 sm:pb-6', className)} {...props} />;
}

export function CardFooter({ className, ...props }: ComponentProps<'div'>) {
    return <div className={cn('flex items-center p-5 pt-0 sm:px-6 sm:pb-6', className)} {...props} />;
}
