import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn';

const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-55 [&_svg]:pointer-events-none [&_svg]:shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700',
    {
        variants: {
            variant: {
                primary:
                    'bg-brand-700 text-white shadow-soft hover:bg-brand-800 hover:shadow-card active:translate-y-px',
                water: 'bg-water-600 text-white shadow-soft hover:bg-water-700 hover:shadow-card active:translate-y-px',
                outline:
                    'border border-ink-200 bg-white/80 text-ink-800 backdrop-blur-sm hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800',
                soft: 'bg-brand-50 text-brand-800 hover:bg-brand-100',
                ghost: 'text-ink-600 hover:bg-ink-50 hover:text-ink-900',
                onDark: 'bg-white/10 text-white backdrop-blur-sm hover:bg-white/20',
                link: 'text-brand-700 underline-offset-4 hover:underline',
            },
            size: {
                sm: 'h-9 px-4 text-sm [&_svg]:size-4',
                md: 'h-11 px-6 text-[0.9375rem] [&_svg]:size-4',
                lg: 'h-13 px-7 text-base [&_svg]:size-5',
                icon: 'size-10 [&_svg]:size-5',
                iconSm: 'size-9 [&_svg]:size-4',
            },
        },
        defaultVariants: {
            variant: 'primary',
            size: 'md',
        },
    },
);

type ButtonProps = ComponentProps<'button'> &
    VariantProps<typeof buttonVariants> & {
        asChild?: boolean;
    };

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
    const Comp = asChild ? Slot : 'button';

    return (
        <Comp
            data-slot="button"
            className={cn(buttonVariants({ variant, size }), className)}
            {...props}
        />
    );
}

export { buttonVariants };