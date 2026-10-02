import { createElement } from 'react';
import type { CSSProperties, ElementType, ReactNode } from 'react';

import { cn } from '../../lib/cn';
import { useInView } from '../../hooks/use-in-view';
import { useReducedMotion } from '../../hooks/use-media-query';

type RevealProps = {
    children: ReactNode;
    /** Retard séquentiel, en millisecondes. */
    delay?: number;
    className?: string;
    /** Balise rendue, pour préserver la sémantique des listes. */
    as?: ElementType;
};

/**
 * Rend un enfant avec une apparition douce au défilement.
 * L'animation est entièrement désactivée si l'utilisateur a demandé
 * une réduction des animations.
 */
export function Reveal({ children, delay = 0, className, as = 'div' }: RevealProps) {
    const { ref, inView } = useInView<HTMLDivElement>();
    const reducedMotion = useReducedMotion();
    const visible = inView || reducedMotion;

    const style: CSSProperties = reducedMotion
        ? {}
        : {
              transitionDelay: `${delay}ms`,
              transitionProperty: 'opacity, transform',
          };

    return createElement(
        as,
        {
            ref,
            style,
            className: cn(
                'transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none',
                visible ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0',
                className,
            ),
        },
        children,
    );
}