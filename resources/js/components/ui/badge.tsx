import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn';

const badgeVariants = cva(
    'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset whitespace-nowrap',
    {
        variants: {
            variant: {
                default: 'bg-ink-900 text-white ring-ink-900/20',
                brand: 'bg-brand-50 text-brand-800 ring-brand-200',
                water: 'bg-water-50 text-water-700 ring-water-200',
                success: 'bg-green-50 text-green-800 ring-green-200',
                warning: 'bg-amber-50 text-amber-800 ring-amber-200',
                danger: 'bg-red-50 text-red-800 ring-red-200',
                outline: 'bg-white text-ink-700 ring-ink-200',
            },
        },
        defaultVariants: { variant: 'default' },
    },
);

export interface BadgeProps extends ComponentProps<'span'>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
    return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
