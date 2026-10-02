import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import type { ComponentProps, ReactNode } from 'react';

import { cn } from '../../lib/cn';

export function TooltipProvider({ children }: { children: ReactNode }) {
    return (
        <TooltipPrimitive.Provider delayDuration={200} skipDelayDuration={300}>
            {children}
        </TooltipPrimitive.Provider>
    );
}

export const TooltipRoot = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export function TooltipContent({
    className,
    sideOffset = 8,
    children,
    ...props
}: ComponentProps<typeof TooltipPrimitive.Content>) {
    return (
        <TooltipPrimitive.Portal>
            <TooltipPrimitive.Content
                sideOffset={sideOffset}
                className={cn(
                    'z-50 max-w-64 rounded-lg bg-ink-900 px-3 py-2 text-xs leading-relaxed text-white shadow-lift',
                    'animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
                    className,
                )}
                {...props}
            >
                {children}
                <TooltipPrimitive.Arrow className="fill-ink-900" width={11} height={5} />
            </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
    );
}

/** Raccourci : une icône ou un bouton décoratif accompagné d'une infobulle. */
export function InfoTooltip({
    label,
    children,
    side = 'top',
}: {
    label: string;
    children: ReactNode;
    side?: 'top' | 'right' | 'bottom' | 'left';
}) {
    return (
        <TooltipRoot>
            <TooltipTrigger asChild>{children}</TooltipTrigger>
            <TooltipContent side={side}>{label}</TooltipContent>
        </TooltipRoot>
    );
}