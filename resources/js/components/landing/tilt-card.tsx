import { useRef } from 'react';
import type { PointerEvent, ReactNode } from 'react';

import { cn } from '../../lib/cn';
import { useMediaQuery } from '../../hooks/use-media-query';

/**
 * Légère inclinaison 3D suivant le pointeur, pour donner de la profondeur
 * à la maquette du tableau de bord. Désactivée sur écrans tactiles et
 * si l'utilisateur préfère moins d'animations.
 */
export function TiltCard({
    children,
    className,
    intensity = 5,
    lift = true,
}: {
    children: ReactNode;
    className?: string;
    intensity?: number;
    lift?: boolean;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const coarsePointer = useMediaQuery('(pointer: coarse)');
    const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
    const disabled = coarsePointer || reducedMotion;

    let frame = 0;

    const apply = (rotateX: number, rotateY: number, translate = 0) => {
        const node = ref.current;
        if (!node) return;

        if (frame) window.cancelAnimationFrame(frame);
        frame = window.requestAnimationFrame(() => {
            node.style.transform = `perspective(1600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translate3d(0, ${translate}px, 0)`;
            frame = 0;
        });
    };

    const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
        if (disabled) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;

        apply(-y * intensity * 2, x * intensity * 2, lift ? -6 : 0);
    };

    const onPointerLeave = () => {
        if (disabled) return;
        apply(0, 0, 0);
    };

    return (
        <div
            ref={ref}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
            style={{ transition: 'transform 400ms cubic-bezier(0.22, 1, 0.36, 1)' }}
            className={cn(disabled ? '' : 'will-change-transform', className)}
        >
            {children}
        </div>
    );
}