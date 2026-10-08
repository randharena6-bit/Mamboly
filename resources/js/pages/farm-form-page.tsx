import { Tractor } from 'lucide-react';

import { AppShell } from '../components/dashboard/app-shell';
import { FarmForm } from '../components/farms/farm-form';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import type { FarmFormValues } from '../types/farm';

/**
 * Page de création ou de modification d'une exploitation.
 *
 * Le rendu est identique dans les deux modes ; seuls le titre, l'action du
 * formulaire et les valeurs initiales changent. L'accès à la page est garantie
 * côté serveur par `FarmPolicy::create` / `FarmPolicy::update`.
 */
export function FarmFormPage({
    mode,
    backUrl,
    farmId,
    initial,
}: {
    mode: 'create' | 'edit';
    backUrl: string;
    farmId?: number;
    initial?: Partial<FarmFormValues>;
}) {
    const isEdit = mode === 'edit';

    return (
        <Frame>
            <AppShell
                activeNav="/exploitations"
                user={{ name: 'Administrateur', role: 'Administrateur', initials: 'AD' }}
                title={isEdit ? `Modifier ${initial?.name ?? "l'exploitation"}` : 'Nouvelle exploitation'}
                subtitle={isEdit ? "Mettez à jour les informations de l'exploitation" : 'Créez une nouvelle exploitation agricole'}
                variant="app"
            >
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Tractor className="size-4 text-brand-600" />
                            {isEdit ? "Modifier l'exploitation" : "Créer une exploitation"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <FarmForm mode={mode} backUrl={backUrl} farmId={farmId} initial={initial} />
                    </CardContent>
                </Card>
            </AppShell>
        </Frame>
    );
}

function Frame({ children }: { children: React.ReactNode }) {
    return <div className="mx-auto w-full max-w-[100rem] px-4 py-6 sm:px-6 lg:py-8">{children}</div>;
}