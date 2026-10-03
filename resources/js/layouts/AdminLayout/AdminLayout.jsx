import { useState } from 'react';
import { router } from '@inertiajs/react';
import { apiFetch } from '../../lib/adminApi';
import './AdminLayout.css';
<<<<<<< Updated upstream
=======

import { useState } from 'react';
import { router } from '@inertiajs/react';
import { apiFetch } from '../../lib/adminApi';

import Sidebar from '../../components/Sidebar/Sidebar';
import AdminHeader from '../../components/AdminHeader/AdminHeader';
>>>>>>> Stashed changes

export default function AdminLayout({ children }) {
    const [loggingOut, setLoggingOut] = useState(false);

    async function handleLogout() {
        setLoggingOut(true);
        try {
            await apiFetch('/admin/logout', { method: 'POST' });
        } catch (_) {
            // mesmo se der erro (ex.: sessão já expirada), manda pro login
        } finally {
            router.visit('/admin/login');
        }
    }

    return (
        <div className="adminWrapper">
<<<<<<< Updated upstream
            <aside className="adminSidebar">
                <h2>Maia Lanches</h2>
                <p className="adminSidebarSubtitle">Painel do administrador</p>

                <nav className="adminSidebarNav">
                    <a href="/admin/pedidos">Pedidos</a>
                </nav>

                <button
                    type="button"
                    className="adminLogoutButton"
                    onClick={handleLogout}
                    disabled={loggingOut}
                >
                    {loggingOut ? 'Saindo...' : 'Sair'}
                </button>
            </aside>

            {/* Área onde as páginas (Produtos, Pedidos) serão renderizadas */}
            <main className="adminContent">
                {children}
            </main>
        </div>
    );
}
