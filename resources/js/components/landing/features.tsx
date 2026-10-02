import {
    BarChart3,
    CalendarCheck,
    Droplets,
    LayoutDashboard,
    ShieldCheck,
    Users,
    Wallet,
    Warehouse,
} from 'lucide-react';
import type { ComponentType } from 'react';

import { routes } from '../../config/site';
import { Button } from '../ui/button';
import { Reveal } from './reveal';
import { Section } from './section';

type Feature = {
    icon: ComponentType<{ className?: string }>;
    title: string;
    description: string;
    tone: string;
};

const features: Feature[] = [
    {
        icon: LayoutDashboard,
        title: 'Tableau de bord intelligent',
        description: 'Visualisez rapidement les indicateurs essentiels de votre exploitation.',
        tone: 'bg-brand-50 text-brand-700 ring-brand-100 group-hover:bg-brand-100',
    },
    {
        icon: Warehouse,
        title: 'Gestion des stocks',
        description: 'Contrôlez les entrées, sorties, quantités disponibles et alertes de stock.',
        tone: 'bg-harvest-50 text-harvest-700 ring-harvest-100 group-hover:bg-harvest-100',
    },
    {
        icon: CalendarCheck,
        title: 'Suivi des activités',
        description: 'Planifiez et suivez les travaux agricoles réalisés sur chaque parcelle.',
        tone: 'bg-ink-50 text-ink-600 ring-ink-100 group-hover:bg-ink-100',
    },
    {
        icon: Wallet,
        title: 'Gestion financière',
        description: 'Suivez vos dépenses, recettes, transactions et résultats financiers.',
        tone: 'bg-brand-50 text-brand-700 ring-brand-100 group-hover:bg-brand-100',
    },
    {
        icon: Droplets,
        title: 'Gestion de l’eau',
        description: 'Analysez la consommation d’eau et optimisez son utilisation.',
        tone: 'bg-water-50 text-water-700 ring-water-100 group-hover:bg-water-100',
    },
    {
        icon: ShieldCheck,
        title: 'Sécurité renforcée',
        description: 'Protégez les données de chaque exploitation grâce à une isolation stricte.',
        tone: 'bg-water-50 text-water-700 ring-water-100 group-hover:bg-water-100',
    },
    {
        icon: Users,
        title: 'Gestion des utilisateurs',
        description: 'Contrôlez les accès selon les rôles et les responsabilités.',
        tone: 'bg-ink-50 text-ink-600 ring-ink-100 group-hover:bg-ink-100',
    },
    {
        icon: BarChart3,
        title: 'Rapports et analyses',
        description: 'Transformez vos données en décisions agricoles plus efficaces.',
        tone: 'bg-harvest-50 text-harvest-700 ring-harvest-100 group-hover:bg-harvest-100',
    },
];

export function Features() {
    return (
        <Section
            id="fonctionnalites"
            eyebrow="Fonctionnalités"
            title="Tout ce qu’il faut pour mieux gérer votre exploitation"
            description="Des modules pensés pour le terrain, du semis à la récolte, et une vision consolidée de votre activité."
        >
            <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {features.map((feature, index) => {
                    const Icon = feature.icon;

                    return (
                        <Reveal key={feature.title} delay={(index % 4) * 80}>
                            <li className="h-full">
                                <a
                                    href={routes.features}
                                    className="group flex h-full flex-col rounded-2xl border border-ink-100 bg-white p-5 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
                                >
                                    <span
                                        className={`grid size-12 place-items-center rounded-xl ring-1 transition-all duration-300 group-hover:scale-105 ${feature.tone}`}
                                    >
                                        <Icon aria-hidden="true" className="size-5.5" />
                                    </span>

                                    <h3 className="mt-4 font-display text-base font-bold tracking-tight text-ink-900">
                                        {feature.title}
                                    </h3>

                                    <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-500">
                                        {feature.description}
                                    </p>

                                    <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 opacity-0 transition-all duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
                                        En savoir plus
                                        <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-0.5">
                                            →
                                        </span>
                                    </span>
                                </a>
                            </li>
                        </Reveal>
                    );
                })}
            </ul>

            <Reveal delay={120}>
                <div className="mt-12 text-center">
                    <Button asChild variant="outline" size="lg">
                        <a href={routes.features}>Découvrir toutes les fonctionnalités</a>
                    </Button>
                </div>
            </Reveal>
        </Section>
    );
}