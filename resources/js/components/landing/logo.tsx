import { useId } from 'react';

import { cn } from '../../lib/cn';

type LogoProps = {
    className?: string;
    /** Version claire pour les fonds sombres (footer, CTA). */
    inverted?: boolean;
};

/**
 * Marque AgriWater : une goutte d'eau contenant une feuille.
 * Les identifiants de dégradé sont générés pour éviter les collisions
 * lorsque le logo apparaît plusieurs fois sur la page.
 */
export function Logo({ className, inverted = false }: LogoProps) {
    const uid = useId().replace(/:/g, '');
    const bodyGradient = `body-${uid}`;
    const highlightGradient = `highlight-${uid}`;
    const leafGradient = `leaf-${uid}`;

    return (
        <span className={cn('inline-flex items-center gap-2.5', className)}>
            <span
                aria-hidden="true"
                className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-50 to-water-50 shadow-soft ring-1 ring-brand-100/80"
            >
                <svg viewBox="0 0 32 32" fill="none" className="size-7">
                    <defs>
                        <linearGradient id={bodyGradient} x1="6" y1="3" x2="26" y2="29">
                            <stop stopColor="#4CAF50" />
                            <stop offset="0.55" stopColor="#2E7D32" />
                            <stop offset="1" stopColor="#0288D1" />
                        </linearGradient>
                        <linearGradient id={highlightGradient} x1="10" y1="8" x2="16" y2="18">
                            <stop stopColor="#fff" stopOpacity="0.85" />
                            <stop offset="1" stopColor="#fff" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id={leafGradient} x1="11" y1="13" x2="23" y2="25">
                            <stop stopColor="#E8F5E9" />
                            <stop offset="1" stopColor="#B3E5FC" />
                        </linearGradient>
                    </defs>

                    {/* Goutte */}
                    <path
                        d="M16 2.6c0 0-9.2 9.9-9.2 15.6a9.2 9.2 0 1 0 18.4 0C25.2 12.5 16 2.6 16 2.6Z"
                        fill={`url(#${bodyGradient})`}
                    />
                    {/* Reflet */}
                    <path
                        d="M11.4 16.4c0-3 2.4-6.8 4-8.6-3.4 1.9-6 5.6-6 9.2 0 1.6.5 3 1.3 4.2-.5-1.5-.3-3.2.7-4.8Z"
                        fill={`url(#${highlightGradient})`}
                    />
                    {/* Feuille */}
                    <path
                        d="M22.4 17.6c-4.3 0-7.8 3.4-7.8 7.6h1.9c0-3 2.4-5.4 5.5-5.4h.4Z"
                        fill={`url(#leafGradient})`}
                        opacity="0.95"
                    />
                    <path
                        d="M17.6 16.2c0 3.4-2.8 6.2-6.2 6.2 0-3.4 2.8-6.2 6.2-6.2Z"
                        fill={`url(#${leafGradient})`}
                    />
                    {/* Nervure */}
                    <path
                        d="M11.4 22.4c1.9-1.9 3.9-3.4 6.4-4.4"
                        stroke="#2E7D32"
                        strokeOpacity="0.55"
                        strokeWidth="1.1"
                        strokeLinecap="round"
                    />
                </svg>
            </span>

            <span
                className={cn(
                    'font-display text-xl font-extrabold tracking-tight',
                    inverted ? 'text-white' : 'text-ink-900',
                )}
            >
                Agri<span className={inverted ? 'text-brand-300' : 'text-brand-700'}>Water</span>
            </span>
        </span>
    );
}