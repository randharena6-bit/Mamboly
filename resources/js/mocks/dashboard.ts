import type { Activity, Alert, InputStock, WaterSource } from '../types';

export const demoActivities: Activity[] = [
    { id: 1, farm_id: 1, plot_id: 1, type: 'irrigation', activity_date: '2026-10-12', description: 'Irrigation goutte-à-goutte parcelle P-A01', cost: 0 },
    { id: 2, farm_id: 1, plot_id: 2, type: 'semis', activity_date: '2026-10-11', description: 'Semis haricots P-A02', cost: 1500 },
];

export const demoAlerts: Alert[] = [
    { id: 1, farm_id: 1, type: 'eau_critique', severity: 'critique', title: 'Niveau critique', message: 'Réservoir principal sous seuil critique', is_read: false, created_at: '2026-10-12T08:00:00Z' },
];

export const demoStock: InputStock[] = [
    { id: 1, farm_id: 1, name: 'Engrais NPK', category: 'engrais', unit: 'kg', minimum_threshold: 50, available_quantity: 80, unit_price: 5000, status: 'actif' },
];

export const demoWater: WaterSource[] = [
    { id: 1, farm_id: 1, name: 'Réservoir principal', type: 'reservoir', capacity: 20000, available_quantity: 18000, unit: 'L', critical_threshold: 4000, status: 'active' },
];
