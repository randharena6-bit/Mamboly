/**
 * Contrat de données du tableau de bord et traduction vers les formats attendus
 * par les composants de présentation.
 *
 * Le service Laravel renvoie des valeurs brutes et leur période ; les libellés,
 * tons, unités et dates relatives sont construits ici, donc côté client, seul
 * endroit où la langue et le fuseau de l'utilisateur sont connus.
 *
 * L'aperçu de la page d'accueil consomme exactement les mêmes formes avec les
 * fixtures de `mock.ts` : un seul rendu sert la démonstration et la réalité.
 */

import type { ActivityRow, AlertRow, StockRow } from './mock';
import {
    activeFarm,
    alerts,
    cashflow,
    currentUser,
    expenseBreakdown,
    heroStats,
    recentActivities,
    stockRows,
    waterConsumptionYear,
    waterSources as mockWaterSources,
} from './mock';
import type { CashflowPoint, Slice, WaterPoint } from '../components/dashboard/charts';
import { formatNumber, formatRelativeTime } from '../lib/format';

/* ------------------------------------------------------------------ */
/* Payload renvoyé par `/dashboard/data`                               */
/* ------------------------------------------------------------------ */

export type DashboardStatId = 'surface' | 'stock' | 'depenses' | 'eau';

export type DashboardStat = {
    id: DashboardStatId;
    label: string;
    value: number;
    unit: string;
    hint?: string;
    /** Variation en pourcentage sur le mois précédent, absente si sans base comparable. */
    delta?: number | null;
    favourableWhen?: 'up' | 'down';
};

export type DashboardPayload = {
    farm: {
        id: number;
        name: string;
        location: string;
        type: string;
        status: string;
        totalArea: number;
        /** Parcelles en culture ; l'en-tête cite le total de l'exploitation. */
        plotsInCropCount: number;
        plotsCount: number;
        campaignsCount: number;
    };
    user: { name: string; role: string | null; initials: string };
    generatedAt: string;
    stats: DashboardStat[];
    water: { month: string; label: string; consumption: number; reference: number | null }[];
    cashflow: { month: string; label: string; expenses: number; revenues: number }[];
    expenseBreakdown: Slice[];
    stock: {
        id: number;
        name: string;
        category: string;
        quantity: number;
        unit: string;
        threshold: number;
        unitPrice: number;
        supplier: string | null;
    }[];
        activities: {
        id: number;
        type: string;
        description: string | null;
        cost: number | null;
        date: string;
        plotCode: string | null;
        plotName: string | null;
        campaignName: string | null;
    }[];
    alerts: {
        id: number;
        severity: string;
        type: string;
        title: string;
        message: string;
        isRead: boolean;
        createdAt: string;
    }[];
    waterSources: {
        id: number;
        name: string;
        type: string;
        available: number;
        capacity: number;
        unit: string;
        threshold: number;
    }[];
    unreadAlerts: number;
};

/* ------------------------------------------------------------------ */
/* Forme consommée par DashboardFull                                   */
/* ------------------------------------------------------------------ */

export type HeroStat = {
    id: DashboardStatId;
    label: string;
    value: string;
    unit?: string;
    delta?: number;
    hint?: string;
    tone: 'brand' | 'water' | 'harvest' | 'ink';
    /** Sens « favorable » de la variation, pour l'interprétation du delta. */
    favourableWhen?: 'up' | 'down';
};

/** Jauge d'eau présentée dans le panneau « Points d'eau ». */
export type WaterSourceGauge = {
    id?: number;
    name: string;
    available: number;
    capacity: number;
    unit: string;
    threshold: number;
    status: 'ok' | 'critique';
};

export type DashboardViewData = {
    farm: {
        name: string;
        location: string;
        type: string;
        totalArea: number;
        plotsInCropCount: number;
        plotsCount: number;
        campaignsCount: number;
    };
    user: { name: string; role: string; initials: string };
    stats: HeroStat[];
    water: WaterPoint[];
    cashflow: CashflowPoint[];
    expenseBreakdown: Slice[];
    stock: StockRow[];
    activities: ActivityRow[];
    alerts: AlertRow[];
    sources: WaterSourceGauge[];
    unreadAlerts: number;
};

/* ------------------------------------------------------------------ */
/* Libellés et tons                                                    */
/* ------------------------------------------------------------------ */

const statTones: Record<DashboardStatId, HeroStat['tone']> = {
    surface: 'brand',
    stock: 'ink',
    depenses: 'harvest',
    eau: 'water',
};

/** Catégories de l'enum `expense_category` (base : expense_category). */
const expenseCategoryLabels: Record<string, string> = {
    semences: 'Semences',
    engrais: 'Engrais',
    carburant: 'Carburant',
    reparation_pompe: 'Réparation pompe',
    materiel: 'Matériel',
    main_oeuvre: 'Main-d’œuvre',
    transport: 'Transport',
    energie_electrique: 'Énergie électrique',
    achat_eau: 'Achat d’eau',
    traitement: 'Traitement',
};

/** Catégories de l'enum `input_category` (base : inputs). */
const inputCategoryLabels: Record<string, string> = {
    semence: 'Semence',
    engrais: 'Engrais',
    produit_phytosanitaire: 'Produit phytosanitaire',
    traitement_eau: 'Traitement d’eau',
    carburant: 'Carburant',
    piece_pompe: 'Pièce de pompe',
    tuyau: 'Tuyau',
    compost: 'Compost',
};

const activityLabels: Record<string, string> = {
    preparation_sol: 'Préparation du sol',
    semis: 'Semis',
    repiquage: 'Repiquage',
    fertilisation: 'Fertilisation',
    traitement: 'Traitement',
    desherbage: 'Désherbage',
    irrigation: 'Irrigation',
    entretien: 'Entretien',
    recolte: 'Récolte',
    observation: 'Observation',
    nettoyage: 'Nettoyage',
    autre: 'Autre activité',
};

const activityTones: Record<string, ActivityRow['tone']> = {
    irrigation: 'water',
    semis: 'brand',
    repiquage: 'brand',
    preparation_sol: 'brand',
    recolte: 'harvest',
    traitement: 'harvest',
    fertilisation: 'ink',
    desherbage: 'ink',
    entretien: 'ink',
    nettoyage: 'ink',
    observation: 'ink',
    autre: 'ink',
};

const severityLabels: Record<string, AlertRow['severity']> = {
    info: 'info',
    avertissement: 'avertissement',
    critique: 'critique',
};

/** Ton d'activité par défaut lorsque le type n'est pas encore cartographié. */
const fallbackActivityTone: ActivityRow['tone'] = 'ink';

/** Première lettre en capitale d'un mot : libellés de saisie saisis en minuscules. */
function sentenceCase(value: string): string {
    if (value === '') return value;
    return value.charAt(0).toLocaleUpperCase('fr') + value.slice(1);
}

function activityLabel(type: string): string {
    return activityLabels[type] ?? sentenceCase(type);
}

function expenseCategoryLabel(category: string): string {
    return expenseCategoryLabels[category] ?? sentenceCase(category);
}

function inputCategoryLabel(category: string): string {
    return inputCategoryLabels[category] ?? sentenceCase(category);
}

function severityOf(value: string): AlertRow['severity'] {
    return severityLabels[value] ?? 'info';
}

/* ------------------------------------------------------------------ */
/* Formatage des valeurs                                               */
/* ------------------------------------------------------------------ */

/**
 * Les mêmes libellés d'unité que sur l'aperçu : les tuiles sont composées d'une
 * valeur compacte et d'une unité, l'unité `M Ar` n'est donc jamais concaténée
 * deux fois.
 */
function formatStat(stat: DashboardStat): { value: string; unit?: string } {
    switch (stat.id) {
        case 'surface':
            return { value: formatNumber(stat.value), unit: 'ha' };
        case 'stock':
            return { value: new Intl.NumberFormat('fr-MG', {
                notation: 'compact',
                maximumFractionDigits: 2,
            }).format(stat.value), unit: 'M Ar' };
        case 'depenses':
            return { value: new Intl.NumberFormat('fr-MG', {
                notation: 'compact',
                maximumFractionDigits: 2,
            }).format(stat.value), unit: 'M Ar' };
        case 'eau':
            return { value: formatNumber(stat.value / 1000), unit: 'k L' };
    }
}

function formatCost(cost: number | null): string | null {
    if (cost === null || cost === 0) return null;
    return `${new Intl.NumberFormat('fr-MG', { maximumFractionDigits: 0 }).format(cost)} Ar`;
}

/* ------------------------------------------------------------------ */
/* Traduction du payload                                               */
/* ------------------------------------------------------------------ */

/**
 * Convertit la réponse du service en données d'affichage. `now` est injectable
 * pour que le rendu soit déterministe en test.
 */
export function toDashboardView(payload: DashboardPayload, now: Date = new Date()): DashboardViewData {
    return {
        farm: {
            name: payload.farm.name,
            location: payload.farm.location,
            type: payload.farm.type,
            totalArea: payload.farm.totalArea,
            plotsInCropCount: payload.farm.plotsInCropCount,
            plotsCount: payload.farm.plotsCount,
            campaignsCount: payload.farm.campaignsCount,
        },
        user: {
            name: payload.user.name,
            role: payload.user.role ?? 'Utilisateur',
            initials: payload.user.initials,
        },
        stats: payload.stats.map((stat) => {
            const { value, unit } = formatStat(stat);

            return {
                id: stat.id,
                label: stat.label,
                value,
                unit,
                // Une variation sans base comparable est omise plutôt que
                // affichée à 0 : l'utilisateur ne verrait pas d'information.
                ...(stat.delta === null || stat.delta === undefined ? {} : { delta: stat.delta }),
                hint: stat.hint,
                tone: statTones[stat.id],
                favourableWhen: stat.favourableWhen,
            };
        }),
        water: payload.water.map((point) => ({
            month: point.label,
            consommation: point.consumption,
            reference: point.reference,
        })),
        cashflow: payload.cashflow.map((point) => ({
            month: point.label,
            depenses: point.expenses,
            recettes: point.revenues,
        })),
        expenseBreakdown: payload.expenseBreakdown.map((slice) => ({
            ...slice,
            name: expenseCategoryLabel(slice.name),
        })),
        stock: payload.stock.map((row) => ({
            ...row,
            category: inputCategoryLabel(row.category),
            supplier: row.supplier ?? '—',
        })),
        activities: payload.activities.map((activity) => {
            const description = activity.description?.trim();
            const label = activityLabel(activity.type);

            return {
                id: activity.id,
                type: label,
                label: description && description !== '' ? sentenceCase(description) : label,
                plot: [activity.plotCode, activity.plotName].filter(Boolean).join(' · ') || 'Parcelle inconnue',
                // Le détail complète la ligne : montant engagé si la saisie en
                // contient un, sinon la campagne rattachée à l'activité.
                detail:
                    formatCost(activity.cost)
                    ?? (activity.campaignName ? `Campagne ${activity.campaignName}` : 'Activité enregistrée'),
                when: formatRelativeTime(activity.date, now),
                tone: activityTones[activity.type] ?? fallbackActivityTone,
            };
        }),
        alerts: payload.alerts.map((alert) => ({
            id: alert.id,
            severity: severityOf(alert.severity),
            title: alert.title,
            message: alert.message,
            time: formatRelativeTime(alert.createdAt, now),
        })),
        sources: payload.waterSources.map((source) => ({
            id: source.id,
            name: source.name,
            available: source.available,
            capacity: source.capacity,
            unit: source.unit || 'L',
            threshold: source.threshold,
            status: source.available <= source.threshold ? 'critique' : 'ok',
        })),
        unreadAlerts: payload.unreadAlerts,
    };
}



/* ------------------------------------------------------------------ */
/* Données de démonstration                                            */
/* ------------------------------------------------------------------ */

/**
 * Mêmes formes que `toDashboardView`, construites à partir des fixtures. La
 * page d'accueil continue ainsi de montrer un tableau de bord sans session ni
 * base de données.
 */
export const demoDashboardView: DashboardViewData = {
    farm: {
        name: activeFarm.name,
        location: activeFarm.location,
        type: activeFarm.type,
        totalArea: activeFarm.totalArea,
        plotsInCropCount: activeFarm.plotsCount,
        plotsCount: activeFarm.plotsCount,
        campaignsCount: activeFarm.campaignsCount,
    },
    user: { name: currentUser.name, role: currentUser.role, initials: currentUser.initials },
    stats: heroStats.map((stat) => ({ ...stat })),
    water: waterConsumptionYear.map((point) => ({ ...point })),
    cashflow: cashflow.map((point) => ({ ...point })),
    expenseBreakdown: expenseBreakdown.map((slice) => ({ ...slice })),
    stock: stockRows.map((row) => ({ ...row })),
    activities: recentActivities.map((row) => ({ ...row })),
    alerts: alerts.map((row) => ({ ...row })),
    sources: mockWaterSources.map((source) => ({ ...source, unit: 'L' })),
    unreadAlerts: alerts.filter((alert) => !('isRead' in alert && alert.isRead)).length,
};
