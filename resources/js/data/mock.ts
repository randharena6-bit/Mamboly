/**
 * Données de démonstration — dérivées du jeu de données AgriWater
 * (`database/seed/agriwater_demo.sql`) : exploitation « Tsinjo Maitso »,
 * Amomboketrimo / Analamanga, maraîchage de 2,50 ha. Montants en Ariary.
 *
 * Elles alimentent les maquettes du tableau de bord et seront remplacées
 * par les ressources de l'API Laravel (voir `lib/api.ts`).
 */

export const activeFarm = {
    id: 1,
    name: 'Tsinjo Maitso',
    location: 'Amomboketrimo, Analamanga',
    type: 'Maraîchage',
    totalArea: 2.5,
    plotsCount: 4,
    campaignsCount: 3,
} as const;

export const currentUser = {
    name: 'Rakoto Jean',
    role: 'Responsable d’exploitation',
    initials: 'RJ',
} as const;

/* ------------------------------------------------------------------ */
/* Tuiles d'indicateurs                                                */
/* ------------------------------------------------------------------ */

export const heroStats = [
    {
        id: 'surface',
        label: 'Surface totale',
        value: '2,50',
        unit: 'ha',
        delta: 12.5,
        hint: '4 parcelles en culture',
        tone: 'brand',
    },
    {
        id: 'stock',
        label: 'Stock disponible',
        value: '1,12',
        unit: 'M Ar',
        delta: -4.2,
        hint: '5 intrants suivis',
        tone: 'ink',
    },
    {
        id: 'depenses',
        label: 'Dépenses du mois',
        value: '1,24',
        unit: 'M Ar',
        delta: 8.4,
        hint: '10 catégories',
        tone: 'harvest',
    },
    {
        id: 'eau',
        label: 'Consommation d’eau',
        value: '58,4',
        unit: 'k L',
        delta: -6.2,
        hint: '3 points d’eau',
        tone: 'water',
    },
] as const;

/* ------------------------------------------------------------------ */
/* Séries de graphiques                                                */
/* ------------------------------------------------------------------ */

/** Consommation d'eau mensuelle, en litres (référence = même période N-1). */
export const waterConsumption = [
    { month: 'Mars', consommation: 62400, reference: 58900 },
    { month: 'Avril', consommation: 74100, reference: 66300 },
    { month: 'Mai', consommation: 88300, reference: 79200 },
    { month: 'Juin', consommation: 96100, reference: 91400 },
    { month: 'Juillet', consommation: 71200, reference: 83800 },
    { month: 'Août', consommation: 58400, reference: 72100 },
] as const;

/** Version 12 mois utilisée dans l'aperçu immersif du tableau de bord. */
export const waterConsumptionYear = [
    { month: 'Sep', consommation: 51800, reference: 56200 },
    { month: 'Oct', consommation: 47300, reference: 54800 },
    { month: 'Nov', consommation: 56900, reference: 61400 },
    { month: 'Déc', consommation: 64200, reference: 68100 },
    { month: 'Jan', consommation: 71500, reference: 76300 },
    { month: 'Fév', consommation: 69800, reference: 77400 },
    { month: 'Mar', consommation: 62400, reference: 58900 },
    { month: 'Avr', consommation: 74100, reference: 66300 },
    { month: 'Mai', consommation: 88300, reference: 79200 },
    { month: 'Juin', consommation: 96100, reference: 91400 },
    { month: 'Juil', consommation: 71200, reference: 83800 },
    { month: 'Août', consommation: 58400, reference: 72100 },
] as const;

/** Dépenses et recettes mensuelles, en Ariary. */
export const cashflow = [
    { month: 'Mars', depenses: 640000, recettes: 985000 },
    { month: 'Avril', depenses: 812000, recettes: 1240000 },
    { month: 'Mai', depenses: 1180000, recettes: 1675000 },
    { month: 'Juin', depenses: 935000, recettes: 1420000 },
    { month: 'Juillet', depenses: 1075000, recettes: 1585000 },
    { month: 'Août', depenses: 1240000, recettes: 1862000 },
] as const;

/** Répartition des dépenses par poste (août). */
export const expenseBreakdown = [
    { name: 'Engrais', value: 386000 },
    { name: 'Main-d’œuvre', value: 248000 },
    { name: 'Carburant', value: 196000 },
    { name: 'Semences', value: 152000 },
    { name: 'Eau', value: 138000 },
    { name: 'Autre', value: 120000 },
] as const;

/* ------------------------------------------------------------------ */
/* Stock                                                               */
/* ------------------------------------------------------------------ */

export type StockRow = {
    id: number;
    name: string;
    category: string;
    quantity: number;
    unit: string;
    threshold: number;
    unitPrice: number;
    supplier: string;
};

export const stockRows: StockRow[] = [
    {
        id: 1,
        name: 'Semences tomate',
        category: 'Semence',
        quantity: 18,
        unit: 'kg',
        threshold: 5,
        unitPrice: 45000,
        supplier: 'Agri-Sème',
    },
    {
        id: 2,
        name: 'Engrais NPK',
        category: 'Engrais',
        quantity: 85,
        unit: 'kg',
        threshold: 20,
        unitPrice: 3500,
        supplier: 'Fertil Madagascar',
    },
    {
        id: 3,
        name: 'Traitement fongicide',
        category: 'Phytosanitaire',
        quantity: 0.5,
        unit: 'L',
        threshold: 3,
        unitPrice: 28000,
        supplier: 'PhytoProtect',
    },
    {
        id: 4,
        name: 'Semences haricot vert',
        category: 'Semence',
        quantity: 9,
        unit: 'kg',
        threshold: 4,
        unitPrice: 28000,
        supplier: 'Agri-Sème',
    },
    {
        id: 5,
        name: 'Compost organique',
        category: 'Amendement',
        quantity: 240,
        unit: 'kg',
        threshold: 50,
        unitPrice: 800,
        supplier: 'Ferme locale',
    },
];

/* ------------------------------------------------------------------ */
/* Activités récentes                                                  */
/* ------------------------------------------------------------------ */

export type ActivityRow = {
    id: number;
    type: string;
    label: string;
    plot: string;
    detail: string;
    when: string;
    tone: 'water' | 'brand' | 'harvest' | 'ink';
};

export const recentActivities: ActivityRow[] = [
    {
        id: 1,
        type: 'Irrigation',
        label: 'Irrigation goutte-à-goutte',
        plot: 'P-A01 · Tomates Nord',
        detail: '1 200 L · Réservoir principal',
        when: 'il y a 2 h',
        tone: 'water',
    },
    {
        id: 2,
        type: 'Récolte',
        label: 'Récolte de laitue',
        plot: 'P-A03 · Parcelle Laitues',
        detail: '480 kg · Qualité A',
        when: 'hier',
        tone: 'brand',
    },
    {
        id: 3,
        type: 'Fertilisation',
        label: 'Apport d’engrais NPK',
        plot: 'P-A02 · Haricots Est',
        detail: '42 kg · Fertil Madagascar',
        when: 'hier',
        tone: 'ink',
    },
    {
        id: 4,
        type: 'Traitement',
        label: 'Traitement phytosanitaire',
        plot: 'P-A01 · Tomates Nord',
        detail: '2 L · Intervention Ranaivo P.',
        when: 'il y a 2 j',
        tone: 'harvest',
    },
];

/* ------------------------------------------------------------------ */
/* Alertes                                                             */
/* ------------------------------------------------------------------ */

export type AlertRow = {
    id: number;
    severity: 'info' | 'avertissement' | 'critique';
    title: string;
    message: string;
    time: string;
};

export const alerts: AlertRow[] = [
    {
        id: 1,
        severity: 'critique',
        title: 'Eau sous le seuil critique',
        message: 'Bassin Sud : 1 800 L restants pour un seuil de 2 500 L. Planifiez un remplissage.',
        time: 'il y a 2 h',
    },
    {
        id: 2,
        severity: 'avertissement',
        title: 'Stock critique : fongicide',
        message: 'Traitement fongicide : 0,5 L pour un seuil minimum de 3 L.',
        time: 'il y a 5 h',
    },
    {
        id: 3,
        severity: 'info',
        title: 'Campagne clôturée',
        message: 'La campagne « Laitue octobre 2026 » est terminée : 2 480 kg récoltés.',
        time: 'il y a 3 j',
    },
];

/* ------------------------------------------------------------------ */
/* Points d'eau                                                        */
/* ------------------------------------------------------------------ */

export const waterSources = [
    { name: 'Réservoir principal', available: 18000, capacity: 20000, threshold: 4000, status: 'ok' },
    { name: 'Citerne Nord', available: 14000, capacity: 15000, threshold: 3000, status: 'ok' },
    { name: 'Bassin Sud', available: 1800, capacity: 12000, threshold: 2500, status: 'critique' },
] as const;