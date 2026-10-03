import './AdminLayout.css';

import { useState } from 'react';
import { router } from '@inertiajs/react';
import { apiFetch } from '../../lib/adminApi';

import Sidebar from '../../components/Sidebar/Sidebar';
import AdminHeader from '../../components/AdminHeader/AdminHeader';

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
            <Sidebar />

            <div className="adminMain">
                <AdminHeader />

                <main className="adminContent">
                    {children}
                </main>
            </div>
        </div>
    );
}
