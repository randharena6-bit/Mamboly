import { ArrowRight, CircleCheck, Play } from 'lucide-react';

import { routes } from '../../config/site';
import { Button } from '../ui/button';
import { DropletField, GridPattern, LeafCluster } from './decorations';
import { Reveal } from './reveal';

export function CallToAction() {
    return (
        <section aria-labelledby="cta-titre" className="relative px-5 py-20 sm:px-6 sm:py-24 lg:px-8">
            <div className="relative mx-auto max-w-6xl">
                <div className="relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-700 via-brand-800 to-water-800 px-6 py-14 shadow-lift sm:px-12 sm:py-16 lg:px-16">
                    {/* Décor */}
                    <div aria-hidden="true" className="absolute inset-0 -z-10">
                        <GridPattern id="agri-cta-grid" className="text-white/10" />
                        <div className="absolute -top-24 -right-16 size-80 rounded-full bg-water-400/25 blur-3xl animate-drift" />
                        <div className="absolute -bottom-28 -left-10 size-80 rounded-full bg-brand-300/25 blur-3xl animate-drift [animation-delay:-8s]" />
                        <DropletField className="opacity-70" />
                        <LeafCluster className="absolute -top-8 right-6 hidden size-48 rotate-12 text-white/25 lg:block" />
                    </div>

                    <div className="relative mx-auto max-w-2xl text-center">
                        <Reveal>
                            <h2
                                id="cta-titre"
                                className="font-display text-3xl font-extrabold tracking-tight text-balance text-white sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]"
                            >
                                Prenez le contrôle de votre exploitation dès aujourd’hui
                            </h2>
                        </Reveal>

                        <Reveal delay={90}>
                            <p className="mt-5 text-base leading-relaxed text-pretty text-brand-50/85 sm:text-lg">
                                Centralisez vos données, optimisez vos ressources et gérez votre activité agricole avec
                                une solution conçue pour vous.
                            </p>
                        </Reveal>

                        <Reveal delay={170}>
                            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                                <Button
                                    asChild
                                    size="lg"
                                    className="group w-full bg-white text-brand-800 shadow-card hover:bg-brand-50 hover:shadow-lift sm:w-auto"
                                >
                                    <a href={routes.register}>
                                        Commencer gratuitement
                                        <ArrowRight
                                            aria-hidden="true"
                                            className="transition-transform duration-200 group-hover:translate-x-1"
                                        />
                                    </a>
                                </Button>

                                <Button
                                    asChild
                                    size="lg"
                                    variant="onDark"
                                    className="group w-full border border-white/25 bg-white/10 hover:bg-white/20 sm:w-auto"
                                >
                                    <a href={routes.demo}>
                                        <Play aria-hidden="true" className="size-4 fill-current" />
                                        Demander une démonstration
                                    </a>
                                </Button>
                            </div>
                        </Reveal>

                        <Reveal delay={240}>
                            <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
                                <CircleCheck aria-hidden="true" className="size-4 text-brand-200" />
                                Aucune carte bancaire requise
                            </p>
                        </Reveal>
                    </div>
                </div>
            </div>
        </section>
    );
}