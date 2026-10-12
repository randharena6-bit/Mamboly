export type Role = {
    id: number;
    name: string;
    description?: string | null;
};

export type Farm = {
    id: number;
    name: string;
    location?: string | null;
    type?: string | null;
    status: string;
    total_area?: number | null;
    plots_count?: number;
    campaigns_count?: number;
};

export type User = {
    id: number;
    farm_id?: number | null;
    role_id: number;
    name: string;
    email: string;
    phone?: string | null;
    is_active: boolean;
    role?: Role;
    farm?: Farm;
};

export type Plot = {
    id: number;
    farm_id: number;
    code: string;
    name: string;
    area: number;
    area_unit: 'm2' | 'ha';
    location?: string | null;
    soil_type?: string | null;
    status: string;
    manual_priority?: string | null;
    soil_moisture?: number | null;
};

export type Crop = {
    id: number;
    name: string;
    category: string;
    estimated_duration_days: number;
    water_requirement: number;
    production_unit: string;
    status: string;
};

export type Campaign = {
    id: number;
    farm_id: number;
    plot_id: number;
    crop_id: number;
    manager_id?: number | null;
    code: string;
    name: string;
    start_date: string;
    expected_end_date: string;
    actual_end_date?: string | null;
    area: number;
    status: string;
};

export type WaterSource = {
    id: number;
    farm_id: number;
    name: string;
    type: string;
    capacity: number;
    available_quantity: number;
    unit: string;
    critical_threshold?: number | null;
    location?: string | null;
    status: string;
};

export type WaterMovement = {
    id: number;
    farm_id: number;
    water_source_id: number;
    campaign_id?: number | null;
    irrigation_id?: number | null;
    type: string;
    quantity: number;
    quantity_before: number;
    quantity_after: number;
    movement_date: string;
    note?: string | null;
};

export type Irrigation = {
    id: number;
    farm_id: number;
    campaign_id: number;
    plot_id: number;
    water_source_id: number;
    quantity: number;
    unit: string;
    method: string;
    status: string;
    performed_at: string;
    performed_by?: number | null;
    validated_by?: number | null;
    observation?: string | null;
};

export type InputStock = {
    id: number;
    farm_id: number;
    name: string;
    category: string;
    unit: string;
    minimum_threshold: number;
    available_quantity: number;
    unit_price: number;
    supplier?: string | null;
    status: string;
};

export type StockMovement = {
    id: number;
    farm_id: number;
    input_id: number;
    campaign_id?: number | null;
    type: string;
    quantity: number;
    stock_before: number;
    stock_after: number;
    movement_date: string;
    note?: string | null;
};

export type Harvest = {
    id: number;
    farm_id: number;
    campaign_id: number;
    plot_id: number;
    quantity: number;
    unit: string;
    harvest_date: string;
    product: string;
};

export type Expense = {
    id: number;
    farm_id: number;
    campaign_id?: number | null;
    amount: number;
    category: string;
    expense_date: string;
    description?: string | null;
};

export type Revenue = {
    id: number;
    farm_id: number;
    campaign_id?: number | null;
    harvest_id?: number | null;
    amount: number;
    revenue_date: string;
    product?: string | null;
    quantity?: number | null;
    client?: string | null;
};

export type Activity = {
    id: number;
    farm_id: number;
    campaign_id?: number | null;
    plot_id: number;
    type: string;
    activity_date: string;
    description?: string | null;
    cost?: number | null;
};

export type Alert = {
    id: number;
    farm_id: number;
    type: string;
    severity: string;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
};
