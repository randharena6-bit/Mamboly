/**
 * Types métier AgriWater — alignés sur le schéma PostgreSQL (`database/schema.sql`).
 * Ces types servent de contrat pour la future API Laravel (voir `lib/api.ts`).
 */

export type FarmStatus = 'active' | 'inactive' | 'suspendue';
export type PlotStatus = 'disponible' | 'en_culture' | 'en_repos';
export type PriorityLevel = 'faible' | 'normale' | 'elevee' | 'critique';
export type WaterSourceStatus = 'active' | 'maintenance' | 'indisponible';
export type AlertSeverity = 'info' | 'avertissement' | 'critique';
export type AlertType = 'eau_critique' | 'stock_critique' | 'campagne_a_risque';

export interface Farm {
    id: number;
    name: string;
    location: string;
    type: string;
    total_area: number;
    status: FarmStatus;
}

export interface Plot {
    id: number;
    farm_id: number;
    code: string;
    name: string;
    area: number;
    area_unit: 'm2' | 'ha';
    soil_type: string | null;
    status: PlotStatus;
    manual_priority: PriorityLevel;
    soil_moisture: number | null;
}

export interface WaterSource {
    id: number;
    farm_id: number;
    name: string;
    type: string;
    capacity: number;
    available_quantity: number;
    unit: string;
    critical_threshold: number;
    status: WaterSourceStatus;
}

export interface Activity {
    id: number;
    farm_id: number;
    plot_id: number;
    user_id: number;
    type: string;
    activity_date: string;
    description: string | null;
    cost: number | null;
}

export interface InputStock {
    id: number;
    farm_id: number;
    name: string;
    category: string;
    unit: string;
    minimum_threshold: number;
    available_quantity: number;
    unit_price: number;
    supplier: string | null;
}

export interface Expense {
    id: number;
    farm_id: number;
    expense_date: string;
    amount: number;
    category: string;
    description: string | null;
}

export interface Revenue {
    id: number;
    farm_id: number;
    revenue_date: string;
    amount: number;
    product: string;
    client: string | null;
}

export interface Alert {
    id: number;
    farm_id: number;
    type: AlertType;
    severity: AlertSeverity;
    title: string;
    message: string;
    is_read: boolean;
}

export interface Role {
    id: number;
    name: string;
    description: string | null;
    permissions: string[];
}

export interface User {
    id: number;
    /** `null` pour un administrateur plateforme (accès multi-exploitations). */
    farm_id: number | null;
    name: string;
    email: string;
    role_id: number;
    is_active: boolean;
}

/** Tuile d'indicateur du tableau de bord. */
export interface DashboardStat {
    label: string;
    value: string;
    unit?: string;
    delta?: number;
    hint?: string;
    icon: 'surface' | 'stock' | 'depenses' | 'eau';
    tone: 'brand' | 'water' | 'harvest' | 'ink';
}