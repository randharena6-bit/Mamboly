import { ChevronDown } from 'lucide-react';
import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn';

export type SelectProps = ComponentProps<'select'>;

export function Select({ className, children, ...props }: SelectProps) {
    return (
        <div className="relative">
            <select
                className={cn(
                    'flex h-11 w-full appearance-none rounded-xl border border-ink-200 bg-white px-3 pr-9 text-sm text-ink-900 shadow-sm transition-all focus-visible:border-brand-300 focus-visible:ring-2 focus-visible:ring-brand-600/20 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60',
                    className,
                )}
                {...props}
            >
                {children}
            </select>
            <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-400"
            />
        </div>
    );
}
