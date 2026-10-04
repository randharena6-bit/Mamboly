import { LockKeyhole, Mail, MapPin, Phone, Sprout, User } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { AuthShell, FormAlert } from '../components/auth/auth-shell';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { routes } from '../config/site';
import { FormError, goTo, submitForm, type FieldErrors } from '../lib/forms';

/**
 * Écran d'inscription : POST /register.
 *
 * Le compte created est rattaché à une exploitation et au rôle « responsable »
 * (voir `RegisteredUserController`) ; l'utilisateur devient son gestionnaire.
 */
export function RegisterPage() {
    const [errors, setErrors] = useState<FieldErrors>({});
    const [message, setMessage] = useState('');
    const [pending, setPending] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const form = event.currentTarget;
        const data = Object.fromEntries(new FormData(form));

        setPending(true);
        setErrors({});
        setMessage('');

        try {
            const { redirect } = await submitForm(routes.register, data);
            goTo(redirect);
        } catch (error) {
            if (error instanceof FormError) {
                setErrors(error.errors);
                // Le résumé serveur n'est pas traduit : on n'affiche que les
                // erreurs de champ, ou un texte générique en français.
                setMessage(
                    Object.keys(error.errors).length
                        ? ''
                        : 'Inscription impossible. Vérifiez les informations saisies.',
                );
            } else {
                setMessage('Inscription impossible. Vérifiez votre réseau et réessayez.');
            }
            setPending(false);
        }
    }

    return (
        <AuthShell
            eyebrow="Inscription"
            title="Créer votre exploitation"
            subtitle="Quelques secondes suffisent : votre espace de gestion est prêt immédiatement."
            footer={
                <>
                    Vous avez déjà un compte ?{' '}
                    <a href={routes.login} className="font-semibold text-brand-700 hover:underline">
                        Se connecter
                    </a>
                </>
            }
        >
            <FormAlert>{message}</FormAlert>

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                <Input
                    id="farm_name"
                    name="farm_name"
                    type="text"
                    label="Nom de l'exploitation"
                    placeholder="Exploitation Tsinjo Maitso"
                    autoComplete="organization"
                    autoFocus
                    required
                    icon={<Sprout />}
                    error={errors.farm_name}
                />

                <Input
                    id="location"
                    name="location"
                    type="text"
                    label="Localisation"
                    placeholder="Ankatso, Analamanga"
                    required
                    icon={<MapPin />}
                    error={errors.location}
                />

                <Input
                    id="name"
                    name="name"
                    type="text"
                    label="Nom complet"
                    autoComplete="name"
                    required
                    icon={<User />}
                    error={errors.name}
                />

                <Input
                    id="email"
                    name="email"
                    type="email"
                    label="Adresse e-mail"
                    autoComplete="username"
                    required
                    icon={<Mail />}
                    error={errors.email}
                />

                <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    label="Téléphone"
                    autoComplete="tel"
                    placeholder="Optionnel"
                    icon={<Phone />}
                    error={errors.phone}
                />

                <Input
                    id="password"
                    name="password"
                    type="password"
                    label="Mot de passe"
                    autoComplete="new-password"
                    required
                    icon={<LockKeyhole />}
                    error={errors.password}
                    hint="8 caractères minimum."
                />

                <Input
                    id="password_confirmation"
                    name="password_confirmation"
                    type="password"
                    label="Confirmer le mot de passe"
                    autoComplete="new-password"
                    required
                    icon={<LockKeyhole />}
                    error={errors.password_confirmation}
                />

                <Button type="submit" size="lg" disabled={pending} className="mt-2 w-full">
                    {pending ? 'Création…' : 'Créer mon exploitation'}
                </Button>
            </form>
        </AuthShell>
    );
}
