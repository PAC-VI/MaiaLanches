import { useState } from 'react';
import './Login.css';

import { Link, router } from '@inertiajs/react';
import { Store, Mail, Lock, Eye, EyeOff } from 'lucide-react';

import { Title, NormalText } from '../../../../styles/globalStyles';
import FormField from '../../../components/FormField/FormField';
import Button from '../../../components/Button/Button';
import { apiFetch } from '../../../lib/adminApi';
import { getFieldErrors, translateApiError } from '../../../lib/apiErrors';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [remember, setRemember] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    const [formError, setFormError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFieldErrors({});
        setFormError('');
        setIsSubmitting(true);

        try {
            await apiFetch('/admin/login', {
                method: 'POST',
                body: JSON.stringify({ email, password, remember }),
            });
            router.visit('/admin/pedidos');
        } catch (err) {
            const fields = getFieldErrors(err);

            if (Object.keys(fields).length > 0) {
                setFieldErrors(fields);
            } else {
                setFormError(translateApiError(err));
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="loginScreen">
            <div className="loginBrand">
                <div className="loginBrandIcon">
                    <Store size={24} color="var(--white)" />
                </div>

                <Title fontSize="2rem" color="var(--white)">Maia Lanches</Title>
                <NormalText fontSize="1.3rem" color="var(--gray-border-darker)">
                    Painel administrativo
                </NormalText>
            </div>

            <form className="loginCard" onSubmit={handleSubmit} noValidate>
                <div className="loginCardHeader">
                    <Title fontSize="1.8rem">Acessar o painel</Title>
                    <NormalText fontSize="1.3rem">Use o login recebido junto com o sistema.</NormalText>
                </div>

                <FormField
                    label="E-mail"
                    type="email"
                    value={email}
                    onChange={(value) => {
                        setEmail(value);
                        setFieldErrors((prev) => ({ ...prev, email: undefined }));
                        setFormError('');
                    }}
                    placeholder="voce@maialanches.com"
                    icon={<Mail size={16} color="var(--gray)" />}
                    maxLength={254}
                    autoComplete="username"
                />

                {fieldErrors.email ? (
                    <NormalText fontSize="1.2rem" color="var(--main-red)">{fieldErrors.email}</NormalText>
                ) : null}

                <FormField
                    label="Senha"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(value) => {
                        setPassword(value);
                        setFieldErrors((prev) => ({ ...prev, password: undefined }));
                        setFormError('');
                    }}
                    placeholder="Sua senha"
                    icon={<Lock size={16} color="var(--gray)" />}
                    maxLength={128}
                    autoComplete="current-password"
                    rightElement={
                        <button
                            type="button"
                            className="loginPasswordToggle"
                            onClick={() => setShowPassword((prev) => !prev)}
                            tabIndex={-1}
                        >
                            {showPassword ? <EyeOff size={16} color="var(--gray)" /> : <Eye size={16} color="var(--gray)" />}
                        </button>
                    }
                />

                {fieldErrors.password ? (
                    <NormalText fontSize="1.2rem" color="var(--main-red)">{fieldErrors.password}</NormalText>
                ) : null}

                <label className="loginRemember">
                    <input
                        type="checkbox"
                        name="remember"
                        checked={remember}
                        onChange={(event) => setRemember(event.target.checked)}
                    />
                    Manter conectado
                </label>

                {formError ? (
                    <NormalText fontSize="1.2rem" color="var(--main-red)">{formError}</NormalText>
                ) : null}

                <Button
                    type="submit"
                    variant="solid-danger"
                    className="loginSubmitButton"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Entrando...' : 'Entrar'}
                </Button>
            </form>

            <Link href="/" className="loginBackLink">
                ← Ver cardápio do cliente
            </Link>
        </div>
    );
}
