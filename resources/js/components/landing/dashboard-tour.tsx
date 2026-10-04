import { ArrowRight, Eye } from 'lucide-react';
import { useState } from 'react';

import { routes } from '../../config/site';
import { DashboardFull, type DashboardViewState } from '../dashboard/dashboard-full';
import { cn } from '../../lib/cn';
import { Button } from '../ui/button';
import { Reveal } from './reveal';
import { Section } from './section';

const views: { id: DashboardViewState; label: string }[] = [
    { id: 'normal', label: 'Données' },
    { id: 'loading', label: 'Chargement' },
    { id: 'empty', label: 'Vide' },
    { id: 'error', label: 'Erreur' },
];

/**
 * Section immersive présentant le tableau de bord complet. Le sélecteur
 * d'état illustre les quatre cycle de vie possibles d'un panneau de données.
 */
export function DashboardTour() {
    const [view, setView] = useState<DashboardViewState>('normal');

    return (
        <Section
            id="tableau-de-bord"
            tone="sand"
            eyebrow="Aperçu produit"
            title="Un tableau de bord pensé pour le terrain"
            description="Surface, stocks, eau, finances et alertes : tout ce qui décide de votre campagne, sur une seule page."
        >
            <Reveal delay={100}>
                <div className="relative mx-auto mt-14 max-w-6xl">
                    <div
                        aria-hidden="true"
                        className="absolute -inset-x-6 -top-6 bottom-0 -z-10 rounded-[2rem] bg-gradient-to-br from-brand-200/25 to-water-200/25 blur-2xl"
                    />

                    {/* Barre de contrôle des états */}
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="flex items-center gap-2 text-xs font-medium text-ink-500">
                            <Eye aria-hidden="true" className="size-4 text-brand-700" />
                            États d’interface du tableau de bord
                        </p>

                        <div
                            role="group"
                            aria-label="Prévisualiser un état du tableau de bord"
                            className="flex rounded-full border border-ink-100 bg-white p-1 shadow-soft"
                        >
                            {views.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setView(item.id)}
                                    aria-pressed={view === item.id}
                                    className={cn(
                                        'rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors duration-200',
                                        view === item.id
                                            ? 'bg-brand-700 text-white shadow-soft'
                                            : 'text-ink-500 hover:bg-brand-50 hover:text-brand-800',
                                    )}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="relative">
                        <DashboardFull view={view} />
                    </div>
                </div>
            </Reveal>

            <Reveal delay={160}>
                <div className="mt-10 flex flex-col items-center gap-4">
                    <Button asChild size="lg" className="group">
                        <a href={routes.dashboard}>
                            Explorer le tableau de bord
                            <ArrowRight
                                aria-hidden="true"
                                className="transition-transform duration-200 group-hover:translate-x-1"
                            />
                        </a>
                    </Button>
                    <p className="text-xs text-ink-400">
                        Aperçu de démonstration — les données affichées sont fictives.
                    </p>
                </div>
            </Reveal>
        </Section>
    );
}