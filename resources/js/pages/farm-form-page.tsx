import { ArrowLeft, RefreshCw, Tractor } from 'lucide-react';
import { useState } from 'react';

import { AppShell } from '../components/dashboard/app-shell';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

type FarmFormPageProps = {
    mode: 'create' | 'edit';
    backUrl: string;
    farm?: {
        id: number;
        name: string;
        location: string | null;
        type: string | null;
        total_area: number | string | null;
        status: string | null;
        manager_id: number | null;
    } | null;
};

export function FarmFormPage({ mode, backUrl, farm }: FarmFormPageProps) {
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [formData, setFormData] = useState({
        name: farm?.name ?? '',
        location: farm?.location ?? '',
        type: farm?.type ?? '',
        total_area: farm?.total_area != null ? String(farm.total_area) : '',
        status: farm?.status ?? 'active',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});

        const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        const url = mode === 'create' ? '/exploitations' : `/exploitations/${farm?.id}`;
        const method = mode === 'create' ? 'POST' : 'PUT';

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': token ?? '',
                },
                credentials: 'same-origin',
                body: JSON.stringify(formData),
            });

            if (response.status === 401 || response.status === 403) {
                window.location.assign('/login');
                return;
            }

            if (!response.ok) {
                const data = await response.json().catch(() => null);
                if (data?.errors) {
                    setErrors(data.errors);
                }
                setLoading(false);
                return;
            }

            const data = await response.json().catch(() => null);
            window.location.assign(data?.redirect ?? backUrl);
        } catch (error) {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <Frame>
            <AppShell
                activeNav="/exploitations"
                user={{ name: 'Administrateur', role: 'Administrateur', initials: 'AD' }}
                title={mode === 'create' ? 'Nouvelle exploitation' : `Modifier ${farm?.name}`}
                subtitle={mode === 'create' ? 'Créer une nouvelle exploitation' : 'Modifier les informations'}
                variant="app"
            >
                <div className="space-y-4">
                    <div>
                        <Button asChild variant="outline" size="sm">
                            <a href={backUrl}>
                                <ArrowLeft className="size-4" />
                                Retour
                            </a>
                        </Button>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Tractor className="size-4 text-brand-600" />
                                {mode === 'create' ? 'Créer une exploitation' : 'Modifier l\'exploitation'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <Label htmlFor="name">Nom *</Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                        className={errors.name ? 'border-red-500' : ''}
                                    />
                                    {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name[0]}</p>}
                                </div>

                                <div>
                                    <Label htmlFor="location">Localisation</Label>
                                    <Input
                                        id="location"
                                        name="location"
                                        value={formData.location}
                                        onChange={handleChange}
                                        className={errors.location ? 'border-red-500' : ''}
                                    />
                                    {errors.location && <p className="mt-1 text-xs text-red-500">{errors.location[0]}</p>}
                                </div>

                                <div>
                                    <Label htmlFor="type">Type</Label>
                                    <Input
                                        id="type"
                                        name="type"
                                        value={formData.type}
                                        onChange={handleChange}
                                        className={errors.type ? 'border-red-500' : ''}
                                    />
                                    {errors.type && <p className="mt-1 text-xs text-red-500">{errors.type[0]}</p>}
                                </div>

                                <div>
                                    <Label htmlFor="total_area">Superficie (ha)</Label>
                                    <Input
                                        id="total_area"
                                        name="total_area"
                                        type="number"
                                        step="0.01"
                                        value={formData.total_area}
                                        onChange={handleChange}
                                        className={errors.total_area ? 'border-red-500' : ''}
                                    />
                                    {errors.total_area && <p className="mt-1 text-xs text-red-500">{errors.total_area[0]}</p>}
                                </div>

                                <div>
                                    <Label htmlFor="status">Statut</Label>
                                    <select
                                        id="status"
                                        name="status"
                                        value={formData.status}
                                        onChange={handleChange}
                                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    >
                                        <option value="active">Actif</option>
                                        <option value="inactive">Inactif</option>
                                        <option value="pending">En attente</option>
                                    </select>
                                </div>

                                <div className="flex gap-2 pt-4">
                                    <Button type="submit" disabled={loading}>
                                        {loading ? 'Enregistrement...' : mode === 'create' ? 'Créer' : 'Mettre à jour'}
                                    </Button>
                                    <Button asChild variant="outline">
                                        <a href={backUrl}>Annuler</a>
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </AppShell>
        </Frame>
    );
}

function Frame({ children }: { children: React.ReactNode }) {
    return <div className="mx-auto w-full max-w-[100rem] px-4 py-6 sm:px-6 lg:py-8">{children}</div>;
}
