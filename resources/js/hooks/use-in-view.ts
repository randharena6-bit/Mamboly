import { useEffect, useRef, useState } from 'react';

/**
 * Détecte l'entrée d'un élément dans le viewport pour déclencher les
 * animations d'apparition au défilement.
 */
export function useInView<T extends HTMLElement>(options?: {
    threshold?: number;
    rootMargin?: string;
    once?: boolean;
}) {
    const { threshold = 0.15, rootMargin = '0px 0px -12% 0px', once = true } = options ?? {};
    const ref = useRef<T>(null);
    const [inView, setInView] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        if (typeof IntersectionObserver === 'undefined') {
            setInView(true);
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setInView(true);
                    if (once) observer.unobserve(entry.target);
                } else if (!once) {
                    setInView(false);
                }
            },
            { threshold, rootMargin },
        );

        observer.observe(element);
        return () => observer.disconnect();
    }, [threshold, rootMargin, once]);

    return { ref, inView };
}