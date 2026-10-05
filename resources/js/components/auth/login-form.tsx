import { LockKeyhole, Mail } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { routes } from '../../config/site';
import { FormError, goTo, submitForm, type FieldErrors } from '../../lib/forms';
import { FormAlert } from './form-alert';

export function LoginForm() {
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
            const { redirect } = await submitForm(routes.login, data);
            goTo(redirect);
        } catch (error) {
            if (error instanceof FormError) {
                setErrors(error.errors);
                setMessage(
                    Object.keys(error.errors).length
                        ? ''
                        : 'Connexion impossible. Vérifiez vos identifiants.',
                );
            } else {
                setMessage('Connexion impossible. Vérifiez votre réseau et réessayez.');
            }
            setPending(false);
        }
    }

    return (
        <>
            <FormAlert>{message}</FormAlert>

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                <Input
                    id="email"
                    name="email"
                    type="email"
                    label="Adresse e-mail"
                    autoComplete="username"
                    autoFocus
                    required
                    icon={<Mail />}
                    error={errors.email}
                />

                <Input
                    id="password"
                    name="password"
                    type="password"
                    label="Mot de passe"
                    autoComplete="current-password"
                    required
                    icon={<LockKeyhole />}
                    error={errors.password}
                />

                <label className="flex w-fit items-center gap-2 text-sm text-ink-600">
                    <input
                        type="checkbox"
                        name="remember"
                        value="1"
                        className="size-4 rounded border-ink-300 text-brand-700 focus:ring-brand-600/30"
                    />
                    Se souvenir de moi
                </label>

                <Button type="submit" size="lg" disabled={pending} className="mt-2 w-full">
                    {pending ? 'Connexion…' : 'Se connecter'}
                </Button>
            </form>
        </>
    );
}
