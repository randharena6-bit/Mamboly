import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn';

export type InputProps = ComponentProps<'input'>;

export function Input({ className, ...props }: InputProps) {
    return (
        <input
            className={cn(
                'flex h-11 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-900 shadow-sm transition-all placeholder:text-ink-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/20 focus-visible:border-brand-300 disabled:cursor-not-allowed disabled:opacity-60',
                className,
            )}
            {...props}
        />
    );
}
