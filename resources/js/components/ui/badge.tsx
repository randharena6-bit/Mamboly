import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn';

const badgeVariants = cva(
    'inline-flex items-center gap-1.5 rounded-full border font-medium [&_svg]:shrink-0',
    {
        variants: {
            variant: {
                brand: 'border-brand-200/80 bg-brand-50 text-brand-800',
                water: 'border-water-200/80 bg-water-50 text-water-800',
                harvest: 'border-harvest-200/80 bg-harvest-50 text-harvest-700',
                ink: 'border-ink-200 bg-ink-50 text-ink-600',
                outline: 'border-ink-200 bg-white text-ink-600',
                onDark: 'border-white/25 bg-white/10 text-white',
            },
            size: {
                sm: 'px-2 py-0.5 text-[0.6875rem] [&_svg]:size-3',
                md: 'px-2.5 py-1 text-xs [&_svg]:size-3.5',
                lg: 'px-3.5 py-1.5 text-[0.8125rem] [&_svg]:size-4',
            },
        },
        defaultVariants: {
            variant: 'brand',
            size: 'md',
        },
    },
);

type BadgeProps = ComponentProps<'span'> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, size, ...props }: BadgeProps) {
    return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { badgeVariants };