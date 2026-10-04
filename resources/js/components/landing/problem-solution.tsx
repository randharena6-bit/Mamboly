import {
    ArrowRight,
    CalendarCheck,
    CircleCheck,
    Database,
    FileSpreadsheet,
    MessageSquare,
    NotebookPen,
    Package,
    Receipt,
    ShieldCheck,
    TrendingUp,
    TriangleAlert,
    Wallet,
    X,
} from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';

import { cn } from '../../lib/cn';
import { routes } from '../../config/site';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Reveal } from './reveal';

type Item = { icon: ComponentType<{ className?: string }>; text: string };

const problems: Item[] = [
    { icon: FileSpreadsheet, text: 'Données dispersées dans plusieurs fichiers' },
    { icon: Package, text: 'Difficulté à suivre les stocks' },
    { icon: Wallet, text: 'Manque de visibilité sur les dépenses' },
    { icon: TriangleAlert, text: 'Risques d’erreurs et de pertes de données' },
    { icon: Database, text: 'Gestion complexe de plusieurs exploitations' },
];

const solutions: Item[] = [
    { icon: Database, text: 'Centralisation des informations' },
    { icon: CalendarCheck, text: 'Suivi des activités en temps réel' },
    { icon: Package, text: 'Gestion précise des stocks' },
    { icon: TrendingUp, text: 'Analyse des finances' },
    { icon: ShieldCheck, text: 'Protection des données de chaque exploitation' },
];

export function ProblemSolution() {
    return (
        <section id="a-propos" aria-labelledby="probleme-titre" className="relative scroll-mt-24 bg-sand-50 py-20 sm:py-24 lg:py-28">
            <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:px-8">
                {/* Colonne gauche — le problème */}
                <div>
                    <Reveal>
                        <Badge variant="outline" size="lg" className="border-harvest-200 bg-harvest-50 text-harvest-700">
                            <TriangleAlert aria-hidden="true" />
                            Le constat
                        </Badge>
                    </Reveal>

                    <Reveal delay={80}>
                        <h2
                            id="probleme-titre"
                            className="mt-4 font-display text-3xl font-extrabold tracking-tight text-balance text-ink-900 sm:text-4xl"
                        >
                            Les défis de la gestion agricole traditionnelle
                        </h2>
                    </Reveal>

                    <Reveal delay={140}>
                        <p className="mt-4 text-base leading-relaxed text-ink-500">
                            Sans outil centralisé, une exploitation perd du temps, oublie des informations et décide à
                            l’aveugle.
                        </p>
                    </Reveal>

                    <ul className="mt-8 space-y-3">
                        {problems.map((item, index) => {
                            const Icon = item.icon;

                            return (
                                <Reveal key={item.text} as="li" delay={180 + index * 70}>
                                    <div className="flex items-start gap-3.5 rounded-2xl border border-harvest-100 bg-white/70 p-4 transition-colors duration-300 hover:border-harvest-200 hover:bg-white">
                                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-harvest-50 text-harvest-700 ring-1 ring-harvest-100">
                                            <Icon aria-hidden="true" className="size-4.5" />
                                        </span>
                                        <span className="flex-1 pt-1 text-sm font-medium text-ink-700">{item.text}</span>
                                        <span
                                            aria-hidden="true"
                                            className="mt-1 grid size-6 shrink-0 place-items-center rounded-full bg-harvest-100/70 text-harvest-700"
                                        >
                                            <X className="size-3.5" />
                                        </span>
                                    </div>
                                </Reveal>
                            );
                        })}
                    </ul>
                </div>

                {/* Colonne droite — la solution */}
                <Reveal delay={120}>
                    <div className="relative overflow-hidden rounded-3xl border border-brand-800/10 bg-gradient-to-br from-brand-800 via-brand-900 to-water-900 p-1.5 shadow-lift">
                        <div
                            aria-hidden="true"
                            className="absolute -top-16 -right-10 size-56 rounded-full bg-water-400/20 blur-3xl"
                        />
                        <div
                            aria-hidden="true"
                            className="absolute -bottom-20 -left-10 size-56 rounded-full bg-brand-400/20 blur-3xl"
                        />

                        <div className="relative h-full rounded-[1.4rem] bg-white/6 p-6 ring-1 ring-white/10 backdrop-blur-sm sm:p-8">
                            <Badge variant="onDark" size="lg">
                                <CircleCheck aria-hidden="true" />
                                La solution
                            </Badge>

                            <h3 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-balance text-white sm:text-3xl">
                                Une plateforme unique pour tout piloter
                            </h3>

                            <p className="mt-3 text-sm leading-relaxed text-brand-100/85">
                                AgriWater remplace vos fichiers dispersés par un espace de travail unique, pensé pour
                                les exploitants et leurs équipes.
                            </p>

                            <ul className="mt-6 space-y-3">
                                {solutions.map((item) => {
                                    const Icon = item.icon;

                                    return (
                                        <li key={item.text} className="flex items-start gap-3">
                                            <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-white/12 text-white ring-1 ring-white/20">
                                                <Icon aria-hidden="true" className="size-4" />
                                            </span>
                                            <span className="pt-1 text-sm font-medium text-white">{item.text}</span>
                                        </li>
                                    );
                                })}
                            </ul>

                            {/* Comparaison visuelle avant / après */}
                            <div className="mt-7 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                                <BeforePanel />
                                <span
                                    aria-hidden="true"
                                    className="mx-auto grid size-8 shrink-0 place-items-center rounded-full bg-white/12 text-white ring-1 ring-white/20"
                                >
                                    <ArrowRight className="size-4" />
                                </span>
                                <AfterPanel />
                            </div>

                            <div className="mt-7">
                                <Button asChild variant="onDark" className="w-full sm:w-auto">
                                    <a href={routes.register}>Créer mon exploitation</a>
                                </Button>
                            </div>
                        </div>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}

const scattered = [
    { icon: FileSpreadsheet, label: 'Excel stocks' },
    { icon: NotebookPen, label: 'Cahier parcel.' },
    { icon: MessageSquare, label: 'Messages' },
    { icon: Receipt, label: 'Caisse papier' },
];

const central = [
    { icon: CalendarCheck, label: 'Activités' },
    { icon: Package, label: 'Stocks' },
    { icon: Wallet, label: 'Finances' },
    { icon: DropletGlyph, label: 'Eau' },
];

function DropletGlyph({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
            <path d="M12 2.6c0 0-9.2 9.9-9.2 15.6a9.2 9.2 0 1 0 18.4 0C21.2 12.5 12 2.6 12 2.6Z" />
        </svg>
    );
}

function PanelShell({
    title,
    tone,
    children,
    footer,
}: {
    title: string;
    tone: 'muted' | 'active';
    children: ReactNode;
    footer: { icon: ComponentType<{ className?: string }>; text: string };
}) {
    const FooterIcon = footer.icon;

    return (
        <div
            className={cn(
                'rounded-2xl border p-3.5',
                tone === 'muted'
                    ? 'border-white/12 bg-white/4'
                    : 'border-brand-300/30 bg-gradient-to-br from-white/14 to-white/6 ring-1 ring-white/15',
            )}
        >
            <p
                className={cn(
                    'text-[0.625rem] font-bold uppercase tracking-[0.12em]',
                    tone === 'muted' ? 'text-white/45' : 'text-brand-100',
                )}
            >
                {title}
            </p>

            <div className="mt-2.5 space-y-1.5">{children}</div>

            <p
                className={cn(
                    'mt-3 flex items-center gap-1.5 border-t pt-2.5 text-[0.6875rem] font-semibold',
                    tone === 'muted' ? 'border-white/10 text-harvest-200' : 'border-white/15 text-brand-100',
                )}
            >
                <FooterIcon aria-hidden="true" className="size-3.5" />
                {footer.text}
            </p>
        </div>
    );
}

function BeforePanel() {
    return (
        <PanelShell
            title="Sans AgriWater"
            tone="muted"
            footer={{ icon: TriangleAlert, text: 'Données dispersées' }}
        >
            {scattered.map((item, index) => {
                const Icon = item.icon;
                return (
                    <span
                        key={item.label}
                        className="flex items-center gap-2 rounded-lg bg-white/6 px-2.5 py-1.5 text-[0.6875rem] text-white/70"
                        style={{ transform: `rotate(${(index - 1.5) * 1.4}deg)` }}
                    >
                        <Icon aria-hidden="true" className="size-3.5 shrink-0 text-white/45" />
                        {item.label}
                    </span>
                );
            })}
        </PanelShell>
    );
}

function AfterPanel() {
    return (
        <PanelShell
            title="Avec AgriWater"
            tone="active"
            footer={{ icon: CircleCheck, text: 'Données centralisées' }}
        >
            <div className="grid grid-cols-2 gap-1.5">
                {central.map((item) => {
                    const Icon = item.icon;
                    return (
                        <span
                            key={item.label}
                            className="flex items-center gap-1.5 rounded-lg bg-white/12 px-2 py-1.5 text-[0.6875rem] font-medium text-white"
                        >
                            <Icon aria-hidden="true" className="size-3.5 shrink-0 text-brand-200" />
                            {item.label}
                        </span>
                    );
                })}
            </div>

            <span className="mt-2 flex items-center justify-center gap-1.5 rounded-lg bg-white py-1.5 text-[0.6875rem] font-bold text-brand-800">
                <ShieldCheck aria-hidden="true" className="size-3.5" />
                AgriWater
            </span>
        </PanelShell>
    );
}