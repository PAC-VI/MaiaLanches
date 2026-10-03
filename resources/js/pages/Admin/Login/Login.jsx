import { useState } from 'react';
import { router } from '@inertiajs/react';
import { apiFetch } from '../../../lib/adminApi';
import './Login.css';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();
        setError(null);
        setLoading(true);

        try {
            await apiFetch('/admin/login', {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            });

            // Sessão criada com sucesso -> segue para o painel de pedidos.
            router.visit('/admin/pedidos');
        } catch (err) {
            setError(err.errors?.email?.[0] ?? err.message ?? 'Não foi possível entrar.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="loginPage">
            <form className="loginCard" onSubmit={handleSubmit}>
                <h1>Maia Lanches</h1>
                <p className="loginSubtitle">Painel do administrador</p>

                {error && <div className="loginError">{error}</div>}

                <label className="loginField">
                    <span>E-mail</span>
                    <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        autoComplete="username"
                        autoFocus
                        required
                    />
                </label>

                <label className="loginField">
                    <span>Senha</span>
                    <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        autoComplete="current-password"
                        required
                    />
                </label>

                <button type="submit" className="loginButton" disabled={loading}>
                    {loading ? 'Entrando...' : 'Entrar'}
                </button>
            </form>
        </div>
    );
}
