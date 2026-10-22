/**
 * Niveaux de qualité graphique.
 *
 * Le profil pilote ce qui se règle à chaud (pixel ratio, ombres, végétation,
 * pluie, portée atmosphérique). La tessellation du relief, elle, est fixée au
 * chargement : changer de qualité ne reconstruit pas la scène.
 */
export type QualityLevel = 'basse' | 'moyenne' | 'haute';

export type QualityProfile = {
    id: QualityLevel;
    label: string;
    description: string;
    /** Plafond du device pixel ratio. */
    maxPixelRatio: number;
    /** Taille de la shadow map du soleil. */
    shadowMapSize: number;
    /** Nombre d'arbres instanciés. */
    treeCount: number;
    /** Nombre de brins d'herbe instanciés (0 = herbe désactivée). */
    grassCount: number;
    /** Nombre de gouttes de pluie. */
    rainCount: number;
    /** Portée du brouillard (multiple de la taille du monde). */
    fogFarFactor: number;
    /** Les ombres des objets sont-elles projetées. */
    shadows: boolean;
};

export const QUALITY_PROFILES: Record<QualityLevel, QualityProfile> = {
    basse: {
        id: 'basse',
        label: 'Basse',
        description: 'Ombres réduites, végétation clairsemée, portée courte.',
        maxPixelRatio: 1,
        shadowMapSize: 1024,
        treeCount: 70,
        grassCount: 4000,
        rainCount: 1400,
        fogFarFactor: 2.4,
        shadows: false,
    },
    moyenne: {
        id: 'moyenne',
        label: 'Moyenne',
        description: 'Équilibre entre réalisme et fluidité.',
        maxPixelRatio: 1.5,
        shadowMapSize: 2048,
        treeCount: 170,
        grassCount: 14000,
        rainCount: 4200,
        fogFarFactor: 3.2,
        shadows: true,
    },
    haute: {
        id: 'haute',
        label: 'Haute',
        description: 'Ombres détaillées, végétation dense, atmosphère étendue.',
        maxPixelRatio: 2,
        shadowMapSize: 4096,
        treeCount: 320,
        grassCount: 28000,
        rainCount: 9000,
        fogFarFactor: 4.2,
        shadows: true,
    },
};

/** Qualité de départ : moyenne, sauf machine peu dotée annoncée par le navigateur. */
export function detectInitialQuality(): QualityProfile {
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    const cores = navigator.hardwareConcurrency ?? 4;

    if (memory <= 4 || cores <= 2) return QUALITY_PROFILES.basse;
    if (memory >= 8 && cores >= 8) return QUALITY_PROFILES.haute;

    return QUALITY_PROFILES.moyenne;
}
