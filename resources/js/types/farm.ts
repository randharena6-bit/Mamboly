/**
 * Types TypeScript alignés sur les payloads `FarmService` (Laravel).
 * Le but : éviter les erreurs TS sur les pages exploitations.
 */

export type FarmUser = {
    name: string | null;
    role: string | null;
    initials: string;
};

export type FarmManager = {
    name: string | null;
    email: string | null;
    phone: string | null;
} | null;

export type FarmTeamMember = {
    id: number;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    lastLoginAt: string | null;
    createdAt: string | null;
};

export type FarmTeam = {
    count: number;
    activeCount: number;
    members: FarmTeamMember[];
};

export type FarmCounts = {
    plots: number;
    plotsInCrop: number;
    campaigns: number;
    campaignsActive: number;
    waterSources: number;
};

export type FarmMetrics = {
    waterAvailable: number;
    stockValue: number;
    monthExpenses: number;
    monthRevenues: number;
};

export type FarmCampaign = {
    id: number;
    name: string;
    code: string;
    status: string;
    cropName: string | null;
    cropCategory: string | null;
    plotCode: string | null;
    plotName: string | null;
    area: number;
    startDate: string;
    expectedEndDate: string;
};

export type FarmSummary = {
    id: number;
    name: string;
    location: string | null;
    type: string | null;
    status: string | null;
    totalArea: number | null;
    manager: FarmManager;
    team: FarmTeam | { count: number; activeCount: number };
    counts: FarmCounts;
    metrics: FarmMetrics;
    unreadAlerts: number;
    lastLoginAt: string | null;
    createdAt: string | null;
};

export type FarmDetail = FarmSummary & {
    team: FarmTeam;
    plotStatuses: Array<{ status: string; count: number }>;
    campaigns: FarmCampaign[];
};

export type FarmsTotals = {
    farms: number;
    users: number;
    plots: number;
    plotsInCrop: number;
    campaignsActive: number;
    stockValue: number;
    unreadAlerts: number;
};

export type FarmsOverviewPayload = {
    mode: 'list' | 'single';
    user: FarmUser;
    generatedAt: string;
    /** Décision serveur : création et suppression réservées à l'administrateur. */
    canManage?: boolean;
    totals?: FarmsTotals;
    farms?: FarmSummary[];
    farm?: FarmDetail | null;
};

export type FarmShowPayload = {
    mode: 'single';
    user: FarmUser;
    generatedAt: string;
    canManage?: boolean;
    farm: FarmDetail;
};

/** Formulaire de création / d'édition d'une exploitation. */
export type FarmFormValues = {
    name: string;
    location: string;
    type: string;
    total_area: string;
    status: string;
};
