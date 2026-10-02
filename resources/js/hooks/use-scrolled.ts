import { useEffect, useState } from 'react';

/**
 * Indicateur de défilement utilisé par la barre de navigation pour passer
 * d'un fond transparent à un fond blanc flou au défilement.
 */
export function useScrolled(offset = 24): boolean {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        let frame = 0;

        const onScroll = () => {
            if (frame) return;
            frame = window.requestAnimationFrame(() => {
                setScrolled(window.scrollY > offset);
                frame = 0;
            });
        };

        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });

        return () => {
            window.removeEventListener('scroll', onScroll);
            if (frame) window.cancelAnimationFrame(frame);
        };
    }, [offset]);

    return scrolled;
}