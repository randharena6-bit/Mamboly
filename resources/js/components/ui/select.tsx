import { ChevronDown } from 'lucide-react';
import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn';

export type SelectProps = ComponentProps<'select'>;

export function Select({ className, children, ...props }: SelectProps) {
    return (
        <div className="relative">
            <select
                className={cn(
                    'flex h-11 w-full appearance-none rounded-xl border border-ink-200 bg-white px-3.5 pr-10 text-sm text-ink-900 shadow-xs transition-all outline-none',
                    'hover:border-ink-300 focus-visible:border-brand-400 focus-visible:ring-4 focus-visible:ring-brand-600/12',
                    'disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400',
                    className,
                )}
                {...props}
            >
                {children}
            </select>
            <span
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded-md bg-white text-ink-400"
            >
                <ChevronDown className="size-4" />
            </span>
        </div>
    );
}
