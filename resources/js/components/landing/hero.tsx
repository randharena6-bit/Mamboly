import { ArrowRight, CircleCheck, Play, Sparkles, Star } from 'lucide-react';

import { cn } from '../../lib/cn';
import { routes } from '../../config/site';
import { DashboardPreview } from '../dashboard/dashboard-preview';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Blobs, DropletField, LeafCluster } from './decorations';
import { Reveal } from './reveal';
import { TiltCard } from './tilt-card';

const trustPoints = ['Exploitations isolées', 'Données chiffrées', 'Available 24 h/24'];

const testimonials = [
    { name: 'Rakoto Jean', role: 'Tsinjo Maitso', initials: 'RJ' },
    { name: 'Rasoanaivo Marie', role: 'Vokatra Soa', initials: 'RM' },
    { name: 'Andriamalala Naivo', role: 'Tanimbary Miray', initials: 'AN' },
];

export function Hero() {
    return (
        <section id="accueil" aria-labelledby="hero-titre" className="relative isolate overflow-hidden pt-32 pb-16 sm:pt-36 lg:pt-40 lg:pb-24">
            {/* Décor */}
            <div aria-hidden="true" className="absolute inset-0 -z-10">
                <div className="absolute inset-0 bg-gradient-to-b from-brand-50/70 via-white to-sand-50" />
                <Blobs />
                <DropletField />
                <LeafCluster className="absolute -top-6 -left-16 hidden size-56 animate-float-slow lg:block" />
                <LeafCluster className="absolute right-0 -bottom-10 hidden size-64 rotate-[140deg] animate-float-slow opacity-70 lg:block [animation-delay:-3s]" />
            </div>

            <div className="mx-auto grid w-full max-w-7xl items-center gap-14 px-5 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:gap-10 lg:px-8">
                {/* Colonne gauche */}
                <div className="max-w-xl">
                    <Reveal>
                        <Badge variant="brand" size="lg" className="shadow-soft">
                            <Sparkles aria-hidden="true" />
                            Gestion agricole intelligente
                        </Badge>
                    </Reveal>

                    <Reveal delay={90}>
                        <h1
                            id="hero-titre"
                            className="mt-5 font-display text-4xl leading-[1.08] font-extrabold tracking-tight text-balance text-ink-900 sm:text-5xl lg:text-[3.65rem]"
                        >
                            Gérez votre{' '}
                            <span className="relative inline-block">
                                <span className="text-gradient-brand">exploitation agricole</span>
                                <svg
                                    aria-hidden="true"
                                    viewBox="0 0 300 12"
                                    preserveAspectRatio="none"
                                    className="absolute -bottom-1 left-0 h-2.5 w-full text-brand-300"
                                    fill="none"
                                >
                                    <path
                                        d="M2 8.5C60 3.5 130 2 298 5"
                                        stroke="currentColor"
                                        strokeWidth="3.5"
                                        strokeLinecap="round"
                                        opacity="0.55"
                                    />
                                </svg>
                            </span>{' '}
                            avec plus de clarté et d’efficacité
                        </h1>
                    </Reveal>

                    <Reveal delay={160}>
                        <p className="mt-6 text-base leading-relaxed text-pretty text-ink-600 sm:text-lg">
                            AgriWater centralise vos activités, vos stocks, vos finances et votre consommation d’eau
                            dans une plateforme sécurisée et simple à utiliser.
                        </p>
                    </Reveal>

                    <Reveal delay={230}>
                        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                            <Button asChild size="lg" className="group">
                                <a href={routes.register}>
                                    Commencer gratuitement
                                    <ArrowRight
                                        aria-hidden="true"
                                        className="transition-transform duration-200 group-hover:translate-x-1"
                                    />
                                </a>
                            </Button>

                            <Button asChild variant="outline" size="lg" className="group">
                                <a href={routes.demo}>
                                    <span className="grid size-7 place-items-center rounded-full bg-brand-100 text-brand-700 transition-colors duration-200 group-hover:bg-brand-200">
                                        <Play aria-hidden="true" className="size-3.5 translate-x-px fill-current" />
                                    </span>
                                    Découvrir AgriWater
                                </a>
                            </Button>
                        </div>
                    </Reveal>

                    <Reveal delay={300}>
                        <p className="mt-4 flex items-center gap-1.5 text-xs text-ink-400">
                            <CircleCheck aria-hidden="true" className="size-3.5 text-brand-600" />
                            Pensé pour les exploitations agricoles modernes
                        </p>
                    </Reveal>

                    <Reveal delay={360}>
                        <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-ink-100 pt-6">
                            <div className="flex -space-x-2">
                                {testimonials.map((person) => (
                                    <span
                                        key={person.name}
                                        title={`${person.name} — ${person.role}`}
                                        className="grid size-9 place-items-center rounded-full border-2 border-white bg-gradient-to-br from-brand-400 to-brand-700 text-[0.625rem] font-bold text-white shadow-soft"
                                    >
                                        {person.initials}
                                    </span>
                                ))}
                            </div>

                            <div>
                                <div className="flex items-center gap-0.5" aria-hidden="true">
                                    {Array.from({ length: 5 }).map((_, index) => (
                                        <Star key={index} className="size-3.5 fill-harvest-400 text-harvest-400" />
                                    ))}
                                </div>
                                <p className="mt-0.5 text-xs font-medium text-ink-500">
                                    <span className="font-bold text-ink-800">3 exploitations</span> déjà pilotées avec
                                    AgriWater
                                </p>
                            </div>
                        </div>
                    </Reveal>
                </div>

                {/* Colonne droite : maquette flottante */}
                <div className="relative">
                    <div
                        aria-hidden="true"
                        className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-brand-200/40 via-white to-water-200/40 blur-2xl"
                    />

                    <Reveal delay={180} className="lg:pl-4">
                        <TiltCard>
                            <div className="relative">
                                {/* Pastilles flottantes décoratives */}
                                <span className="absolute -top-5 -left-4 z-10 hidden animate-float rounded-xl border border-white/80 bg-white/90 px-3 py-2 shadow-card backdrop-blur-md sm:block">
                                    <span className="flex items-center gap-2">
                                        <span className="grid size-6 place-items-center rounded-lg bg-water-50 text-water-700">
                                            <CircleCheck aria-hidden="true" className="size-3.5" />
                                        </span>
                                        <span className="text-[0.6875rem] font-semibold text-ink-800">
                                            Réserve suffisant
                                        </span>
                                    </span>
                                </span>

                                <span
                                    className="absolute -right-3 -bottom-5 z-10 hidden animate-float rounded-xl border border-white/80 bg-white/90 px-3 py-2 shadow-card backdrop-blur-md sm:block [animation-delay:-2.5s]"
                                >
                                    <span className="flex items-center gap-2">
                                        <span className="grid size-6 place-items-center rounded-lg bg-harvest-50 text-harvest-700">
                                            <CircleCheck aria-hidden="true" className="size-3.5" />
                                        </span>
                                        <span className="text-[0.6875rem] font-semibold text-ink-800">
                                            Stock critique détecté
                                        </span>
                                    </span>
                                </span>

                                <DashboardPreview />
                            </div>
                        </TiltCard>
                    </Reveal>

                    <Reveal delay={420}>
                        <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 lg:justify-end">
                            {trustPoints.map((point) => (
                                <li key={point} className="flex items-center gap-1.5 text-xs font-medium text-ink-500">
                                    <CircleCheck aria-hidden="true" className={cn('size-3.5 text-brand-600')} />
                                    {point}
                                </li>
                            ))}
                        </ul>
                    </Reveal>
                </div>
            </div>
        </section>
    );
}