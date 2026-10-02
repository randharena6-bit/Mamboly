import { useEffect, useState } from 'react';

/** Suit une media query et se resynchronise lors des changements. */
export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return;

        const list = window.matchMedia(query);
        setMatches(list.matches);

        const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
        list.addEventListener('change', onChange);
        return () => list.removeEventListener('change', onChange);
    }, [query]);

    return matches;
}

/** Respecte la préférence système de réduction des animations. */
export function useReducedMotion(): boolean {
    return useMediaQuery('(prefers-reduced-motion: reduce)');
}