import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn';

export type TextareaProps = ComponentProps<'textarea'>;

export function Textarea({ className, ...props }: TextareaProps) {
    return (
        <textarea
            className={cn(
                'flex min-h-28 w-full resize-y rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-ink-900 shadow-xs transition-all outline-none placeholder:text-ink-400 hover:border-ink-300 focus-visible:border-brand-400 focus-visible:ring-4 focus-visible:ring-brand-600/12 disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400',
                className,
            )}
            {...props}
        />
    );
}
