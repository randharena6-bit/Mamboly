import { Clock, Droplets, Fingerprint, LockKeyhole, Package, ShieldCheck, Sprout, Users, Wallet } from 'lucide-react';
import type { ComponentType } from 'react';

import { routes } from '../../config/site';
import { Button } from '../ui/button';
import { GridPattern } from './decorations';
import { Reveal } from './reveal';
import { Section } from './section';

type Guarantee = {
    icon: ComponentType<{ className?: string }>;
    title: string;
    text: string;
};

const guarantees: Guarantee[] = [
    {
        icon: LockKeyhole,
        title: 'Isolation des données',
        text: 'Une exploitation ne peut accéder qu’à ses propres données.',
    },
    {
        icon: Users,
        title: 'Gestion des rôles',
        text: 'Chaque utilisateur dispose uniquement des permissions nécessaires.',
    },
    {
        icon: Clock,
        title: 'Traçabilité des actions',
        text: 'Les opérations importantes peuvent être suivies et contrôlées.',
    },
];

/** Exploitations représentées dans le schéma multi-tenant (issu du jeu de démo). */
const farms = [
    {
        name: 'Tsinjo Maitso',
        meta: 'Maraîchage · 2,50 ha',
        accent: 'bg-brand-600',
        chips: [
            { icon: Sprout, label: 'Parcelles' },
            { icon: Package, label: 'Stocks' },
            { icon: Wallet, label: 'Finances' },
        ],
    },
    {
        name: 'Vokatra Soa',
        meta: 'Maraîchage · 3,20 ha',
        accent: 'bg-water-600',
        chips: [
            { icon: Droplets, label: 'Eau' },
            { icon: Package, label: 'Stocks' },
            { icon: Wallet, label: 'Finances' },
        ],
    },
    {
        name: 'Tanimbary Miray',
        meta: 'Riziculture · 5,75 ha',
        accent: 'bg-harvest-600',
        chips: [
            { icon: Sprout, label: 'Campagnes' },
            { icon: Droplets, label: 'Eau' },
            { icon: Wallet, label: 'Finances' },
        ],
    },
] as const;

export function Security() {
    return (
        <Section
            id="securite"
            tone="brand"
            eyebrow="Sécurité SaaS"
            title="Chaque exploitation garde le contrôle de ses données"
            description="AgriWater permet à plusieurs exploitations agricoles d’utiliser la même plateforme tout en garantissant une séparation stricte et sécurisée de leurs informations."
        >
            {/* Garanties */}
            <ul className="mt-14 grid gap-4 md:grid-cols-3">
                {guarantees.map((item, index) => {
                    const Icon = item.icon;

                    return (
                        <Reveal key={item.title} as="li" delay={index * 90}>
                            <div className="group flex h-full flex-col rounded-2xl border border-white bg-white/85 p-5 shadow-soft backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-card">
                                <span className="grid size-11 place-items-center rounded-xl bg-brand-700 text-white shadow-soft transition-transform duration-300 group-hover:scale-105">
                                    <Icon aria-hidden="true" className="size-5" />
                                </span>
                                <h3 className="mt-4 font-display text-base font-bold tracking-tight text-ink-900">
                                    {item.title}
                                </h3>
                                <p className="mt-2 text-sm leading-relaxed text-ink-500">{item.text}</p>
                            </div>
                        </Reveal>
                    );
                })}
            </ul>

            {/* Illustration multi-tenant */}
            <Reveal delay={140}>
                <figure className="relative mt-12 overflow-hidden rounded-3xl border border-brand-200/70 bg-white p-6 shadow-soft sm:p-10">
                    <GridPattern id="agri-security-grid" className="text-brand-700/8" />

                    <figcaption className="relative text-center">
                        <h3 className="font-display text-lg font-bold tracking-tight text-ink-900">
                            Architecture multi-exploitations
                        </h3>
                        <p className="mx-auto mt-1.5 max-w-lg text-sm text-ink-500">
                            Chaque exploitation est un espace cloisonné. Les requêtes sont filtrées côté serveur : un
                            utilisateur ne voit jamais les données d’un autre tenant.
                        </p>
                    </figcaption>

                    <div className="relative mt-8">
                        {/* Exploitations */}
                        <ul className="grid gap-4 sm:grid-cols-3">
                            {farms.map((farm, index) => (
                                <li key={farm.name} className="group relative">
                                    <Reveal delay={index * 100}>
                                        <div className="h-full rounded-2xl border border-ink-100 bg-white p-4 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-card">
                                            <div className="flex items-center gap-2.5">
                                                <span
                                                    className={`grid size-9 shrink-0 place-items-center rounded-xl ${farm.accent} text-white`}
                                                >
                                                    <Sprout aria-hidden="true" className="size-4.5" />
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-bold text-ink-900">{farm.name}</p>
                                                    <p className="truncate text-[0.6875rem] text-ink-400">{farm.meta}</p>
                                                </div>
                                                <span
                                                    aria-label="Données chiffrées"
                                                    className="ml-auto grid size-7 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100"
                                                >
                                                    <LockKeyhole aria-hidden="true" className="size-3.5" />
                                                </span>
                                            </div>

                                            <ul className="mt-3.5 flex flex-wrap gap-1.5">
                                                {farm.chips.map((chip) => {
                                                    const ChipIcon = chip.icon;
                                                    return (
                                                        <li
                                                            key={chip.label}
                                                            className="inline-flex items-center gap-1 rounded-lg bg-sand-50 px-2 py-1 text-[0.625rem] font-medium text-ink-600 ring-1 ring-ink-100"
                                                        >
                                                            <ChipIcon aria-hidden="true" className="size-3 text-ink-400" />
                                                            {chip.label}
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    </Reveal>
                                </li>
                            ))}
                        </ul>

                        {/* Bus de connexion */}
                        <div aria-hidden="true" className="hidden sm:block">
                            <div className="relative mx-auto h-10 w-px bg-gradient-to-b from-brand-300 to-brand-500" />
                            <div className="mx-auto h-px w-[66.666%] bg-gradient-to-r from-transparent via-brand-400 to-transparent" />
                        </div>
                        <div aria-hidden="true" className="flex justify-center sm:hidden">
                            <div className="h-8 w-px bg-gradient-to-b from-brand-300 to-brand-500" />
                        </div>

                        {/* Plateforme centrale */}
                        <div className="mx-auto max-w-lg rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-700 to-brand-900 p-5 text-center shadow-lift">
                            <div className="flex items-center justify-center gap-2.5">
                                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/12 text-white ring-1 ring-white/20">
                                    <ShieldCheck aria-hidden="true" className="size-5" />
                                </span>
                                <div className="text-left">
                                    <p className="font-display text-base font-bold text-white">Plateforme AgriWater</p>
                                    <p className="text-[0.6875rem] text-brand-100/80">
                                        Authentification, rôles et journal d’activité
                                    </p>
                                </div>
                            </div>

                            <ul className="mt-4 grid gap-2 sm:grid-cols-3">
                                {[
                                    { icon: Fingerprint, label: 'Contrôle d’accès' },
                                    { icon: LockKeyhole, label: 'Données cloisonnées' },
                                    { icon: Clock, label: 'Journal traçable' },
                                ].map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <li
                                            key={item.label}
                                            className="flex items-center justify-center gap-1.5 rounded-xl bg-white/10 px-2 py-2 text-[0.6875rem] font-medium text-white ring-1 ring-white/12"
                                        >
                                            <Icon aria-hidden="true" className="size-3.5 text-brand-200" />
                                            {item.label}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </div>

                    <p className="relative mt-5 text-center text-[0.6875rem] text-ink-400">
                        Schéma illustratif — l’isolation est appliquée à chaque requête par le serveur Laravel.
                    </p>
                </figure>
            </Reveal>

            <Reveal delay={160}>
                <div className="mt-10 text-center">
                    <Button asChild variant="primary" size="lg">
                        <a href={routes.security}>En savoir plus sur la sécurité</a>
                    </Button>
                </div>
            </Reveal>
        </Section>
    );
}