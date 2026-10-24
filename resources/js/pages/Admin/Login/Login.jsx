import { useState } from 'react';
import './Login.css';

import { Link } from '@inertiajs/react';
import { Store, Mail, Lock, Eye, EyeOff } from 'lucide-react';

import { Title, NormalText } from '../../../../styles/globalStyles';
import FormField from '../../../components/FormField/FormField';
import Button from '../../../components/Button/Button';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Login', { email, password });
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

            <form className="loginCard" onSubmit={handleSubmit}>
                <div className="loginCardHeader">
                    <Title fontSize="1.8rem">Acessar o painel</Title>
                    <NormalText fontSize="1.3rem">Use o login recebido junto com o sistema.</NormalText>
                </div>

                <FormField
                    label="E-mail"
                    type="email"
                    value={email}
                    onChange={setEmail}
                    placeholder="voce@maialanches.com"
                    icon={<Mail size={16} color="var(--gray)" />}
                />

                <FormField
                    label="Senha"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={setPassword}
                    placeholder="Sua senha"
                    icon={<Lock size={16} color="var(--gray)" />}
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

                <Button type="submit" variant="solid-danger" className="loginSubmitButton">
                    Entrar
                </Button>
            </form>

            <Link href="/" className="loginBackLink">
                ← Ver cardápio do cliente
            </Link>
        </div>
    );
}