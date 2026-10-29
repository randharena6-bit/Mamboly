export type SettingsTab = 'profil' | 'securite' | 'exploitation' | 'notifications' | 'apparence';

export type SettingsPreferences = {
    email_alerts: boolean;
    alert_min_severity: 'info' | 'avertissement' | 'critique';
    reduce_motion: boolean;
    sidebar_collapsed: boolean;
};

export type SettingsUser = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    role: string | null;
    roleLabel: string | null;
    isActive: boolean;
    emailVerified: boolean;
    lastLoginAt: string | null;
    createdAt: string | null;
    initials: string;
    preferences: SettingsPreferences;
};

export type SettingsFarm = {
    id: number;
    name: string;
    location: string | null;
    type: string | null;
    totalArea: number;
    status: string;
    canUpdate: boolean;
};

export type SettingsPayload = {
    user: SettingsUser;
    farm: SettingsFarm | null;
    meta: {
        appName: string;
        locale: string;
        timezone: string;
        sessionDriver: string;
    };
};
