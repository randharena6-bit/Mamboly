import { ArrowRight, CircleCheck, Play, Sparkles, Star } from 'lucide-react';

import { cn } from '../../lib/cn';
import { routes } from '../../config/site';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Blobs, DropletField, LeafCluster } from './decorations';
import { Reveal } from './reveal';

const trustPoints = ['Exploitations isolées', 'Données chiffrées', 'Available 24 h/24'];

const testimonials = [
    { name: 'Rakoto Jean', role: 'Tsinjo Maitso', initials: 'RJ' },
    { name: 'Rasoanaivo Marie', role: 'Vokatra Soa', initials: 'RM' },
    { name: 'Andriamalala Naivo', role: 'Tanimbary Miray', initials: 'AN' },
];

export function Hero() {
    return (
        <section
            id="accueil"
            aria-labelledby="hero-titre"
            className="relative isolate flex min-h-screen items-center overflow-hidden pt-32 pb-16 sm:pt-36 lg:pt-40 lg:pb-24"
        >
            {/* Décor : photo plein cadre en fond + voile clair pour la lisibilité */}
            <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
                <div className="hero-photo absolute -inset-10 animate-drift-soft" />
                <div className="absolute inset-0 bg-gradient-to-b from-ink-950/45 via-ink-950/50 to-ink-950/75" />
                <Blobs className="opacity-60" />
                <DropletField />
                <LeafCluster className="absolute -top-6 -left-16 hidden size-56 animate-float-slow lg:block" />
                <LeafCluster className="absolute right-0 -bottom-10 hidden size-64 rotate-[140deg] animate-float-slow opacity-70 lg:block [animation-delay:-3s]" />
            </div>

            <div className="mx-auto grid w-full max-w-4xl justify-items-center gap-14 px-5 text-center sm:px-6 lg:px-8">
                {/* Colonne unique : badge, titre, appel à l'action */}
                <div className="w-full max-w-2xl">
                    <Reveal className="flex justify-center">
                        <Badge variant="onDark" size="lg" className="shadow-soft">
                            <Sparkles aria-hidden="true" />
                            Gestion agricole intelligente
                        </Badge>
                    </Reveal>

                    <Reveal delay={90}>
                        <h1
                            id="hero-titre"
                            className="mt-5 font-display text-4xl leading-[1.1] font-extrabold tracking-tight text-balance text-white sm:text-5xl lg:text-[3.4rem]"
                        >
                            Gérez votre{' '}
                            <span className="relative inline-block">
                                <span className="text-gradient-fresh">exploitation agricole</span>
                                <svg
                                    aria-hidden="true"
                                    viewBox="0 0 300 12"
                                    preserveAspectRatio="none"
                                    className="absolute -bottom-1 left-0 h-2.5 w-full text-brand-200"
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
                        <p className="mt-6 text-base leading-relaxed text-pretty text-brand-100/85 sm:text-lg">
                            AgriWater centralise vos activités, vos stocks, vos finances et votre consommation d’eau
                            dans une plateforme sécurisée et simple à utiliser.
                        </p>
                    </Reveal>

                    <Reveal delay={230}>
                        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:items-center">
                            <Button asChild size="lg" className="group">
                                <a href={routes.register}>
                                    Commencer gratuitement
                                    <ArrowRight
                                        aria-hidden="true"
                                        className="transition-transform duration-200 group-hover:translate-x-1"
                                    />
                                </a>
                            </Button>

                            <Button asChild variant="onDark" size="lg" className="group">
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
                        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-white/70">
                            <CircleCheck aria-hidden="true" className="size-3.5 text-brand-300" />
                            Pensé pour les exploitations agricoles modernes
                        </p>
                    </Reveal>

                    <Reveal delay={360}>
                        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 border-t border-white/20 pt-6">
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
                                <p className="mt-0.5 text-xs font-medium text-white/75">
                                    <span className="font-bold text-white">3 exploitations</span> déjà pilotées avec
                                    AgriWater
                                </p>
                            </div>
                        </div>
                    </Reveal>

                    <Reveal delay={420}>
                        <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
                            {trustPoints.map((point) => (
                                <li key={point} className="flex items-center gap-1.5 text-xs font-medium text-white/75">
                                    <CircleCheck aria-hidden="true" className={cn('size-3.5 text-brand-300')} />
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