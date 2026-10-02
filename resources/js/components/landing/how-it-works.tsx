import { ArrowRight, Database, LayoutDashboard, Plus } from 'lucide-react';
import type { ComponentType } from 'react';

import { routes } from '../../config/site';
import { Button } from '../ui/button';
import { Reveal } from './reveal';
import { Section } from './section';

type Step = {
    title: string;
    description: string;
    icon: ComponentType<{ className?: string }>;
    details: string[];
};

const steps: Step[] = [
    {
        title: 'Créez votre exploitation',
        description: 'Configurez les informations principales de votre exploitation agricole.',
        icon: Plus,
        details: ['Nom et localisation', 'Type de culture', 'Rôles et utilisateurs'],
    },
    {
        title: 'Ajoutez vos données',
        description: 'Enregistrez vos parcelles, activités, stocks, utilisateurs et transactions.',
        icon: Database,
        details: ['Parcelles et cultures', 'Stocks et intrants', 'Dépenses et recettes'],
    },
    {
        title: 'Pilotez votre activité',
        description: 'Utilisez les indicateurs et les rapports pour prendre de meilleures décisions.',
        icon: LayoutDashboard,
        details: ['Tableaux de bord', 'Alertes intelligentes', 'Rapports exportables'],
    },
];

export function HowItWorks() {
    return (
        <Section
            id="demarrage"
            tone="white"
            eyebrow="Fonctionnement"
            title="Commencez à utiliser AgriWater en trois étapes"
            description="Une prise en main progressive : aucun paramétrage complexe, aucune donnée à importer au préalable."
        >
            <div className="relative mt-16">
                {/* Ligne de liaison desktop */}
                <div
                    aria-hidden="true"
                    className="absolute inset-x-0 top-7 hidden h-px lg:block"
                    style={{
                        backgroundImage:
                            'repeating-linear-gradient(90deg, var(--color-brand-400) 0 6px, transparent 6px 12px)',
                        opacity: 0.55,
                    }}
                />

                <ol className="grid gap-8 lg:grid-cols-3 lg:gap-10">
                    {steps.map((step, index) => {
                        const Icon = step.icon;

                        return (
                            <Reveal key={step.title} as="li" delay={index * 110} className="relative">
                                <div className="group relative flex h-full flex-col items-center text-center lg:px-4">
                                    {/* Pastille numérotée */}
                                    <span className="relative z-10 grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-600 to-water-600 text-white shadow-card transition-transform duration-300 group-hover:scale-105 group-hover:shadow-lift">
                                        <Icon aria-hidden="true" className="size-6" />
                                        <span className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-ink-900 text-[0.625rem] font-bold text-white ring-2 ring-white">
                                            {index + 1}
                                        </span>
                                    </span>

                                    <h3 className="mt-6 font-display text-lg font-bold tracking-tight text-ink-900">
                                        {step.title}
                                    </h3>

                                    <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-500">
                                        {step.description}
                                    </p>

                                    <ul className="mt-5 flex flex-wrap justify-center gap-2">
                                        {step.details.map((detail) => (
                                            <li
                                                key={detail}
                                                className="rounded-full border border-ink-100 bg-sand-50 px-2.5 py-1 text-[0.6875rem] font-medium text-ink-600"
                                            >
                                                {detail}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </Reveal>
                        );
                    })}
                </ol>
            </div>

            <Reveal delay={160}>
                <div className="mt-14 text-center">
                    <Button asChild size="lg" className="group">
                        <a href={routes.register}>
                            Créer mon exploitation
                            <ArrowRight
                                aria-hidden="true"
                                className="transition-transform duration-200 group-hover:translate-x-1"
                            />
                        </a>
                    </Button>
                </div>
            </Reveal>
        </Section>
    );
}