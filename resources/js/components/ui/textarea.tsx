import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn';

export type TextareaProps = ComponentProps<'textarea'>;

export function Textarea({ className, ...props }: TextareaProps) {
    return (
        <textarea
            className={cn(
                'flex min-h-24 w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-900 shadow-sm transition-all placeholder:text-ink-400 focus-visible:border-brand-300 focus-visible:ring-2 focus-visible:ring-brand-600/20 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60',
                className,
            )}
            {...props}
        />
    );
}
