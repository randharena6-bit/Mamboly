import type { ReactNode } from 'react';

import { Logo } from '../landing/logo';
import { routes } from '../../config/site';

/**
 * Ossature commune aux écrans /login et /register.
 *
 * Deux colonnes sur grand écran : la marque à gauche, le formulaire à droite.
 * Sur mobile, seul le formulaire reste visible.
 */
export function AuthShell({
    eyebrow,
    title,
    subtitle,
    children,
    footer,
}: {
    eyebrow: string;
    title: string;
    subtitle: ReactNode;
    children: ReactNode;
    footer: ReactNode;
}) {
    return (
        <div className="grid min-h-screen lg:grid-cols-2">
            {/* Panneau de marque — masqué sur mobile pour laisser la place au formulaire. */}
            <aside className="relative isolate hidden overflow-hidden bg-brand-900 p-10 text-white lg:flex lg:flex-col lg:justify-between">
                <div aria-hidden="true" className="absolute inset-0 -z-10">
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-800 via-brand-900 to-water-900" />
                    <div className="absolute -top-24 -left-16 size-[28rem] rounded-full bg-brand-400/25 blur-3xl animate-drift" />
                    <div className="absolute -right-20 -bottom-28 size-[30rem] rounded-full bg-water-400/20 blur-3xl animate-drift [animation-delay:-8s]" />
                </div>

                <a href={routes.home} className="w-fit">
                    <Logo inverted />
                </a>

                <div className="max-w-md">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-200">
                        Gestion agricole intelligente
                    </p>
                    <p className="mt-4 font-display text-3xl leading-tight font-extrabold tracking-tight text-balance">
                        Vos parcelles, vos stocks et vos finances, réunis autour de l’eau.
                    </p>
                    <p className="mt-4 text-sm leading-relaxed text-brand-100/85">
                        AgriWater cloisonne chaque exploitation : vos données restent les vôtres, et votre
                        équipe ne voit que ce qui la concerne.
                    </p>
                </div>

                <p className="text-xs text-brand-200/70">
                    © {new Date().getFullYear()} AgriWater — Antananarivo, Madagascar
                </p>
            </aside>

            {/* Formulaire */}
            <main className="flex flex-col justify-center bg-white px-5 py-12 sm:px-8">
                <div className="mx-auto w-full max-w-md">
                    <a
                        href={routes.home}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline lg:hidden"
                    >
                        <span aria-hidden="true">←</span> Accueil
                    </a>

                    <header className="mt-8 lg:mt-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">
                            {eyebrow}
                        </p>
                        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink-900">
                            {title}
                        </h1>
                        <div className="mt-2 text-sm leading-relaxed text-ink-500">{subtitle}</div>
                    </header>

                    <div className="mt-8">{children}</div>

                    <div className="mt-8 text-center text-sm text-ink-500">{footer}</div>
                </div>
            </main>
        </div>
    );
}

/** Bandeau d'erreur global, pour les échecs non rattachés à un champ. */
export function FormAlert({ children }: { children: ReactNode }) {
    if (!children) return null;

    return (
        <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
            {children}
        </div>
    );
}
