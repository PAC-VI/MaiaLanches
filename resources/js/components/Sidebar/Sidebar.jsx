import './Sidebar.css';

import { Link, usePage } from '@inertiajs/react';
import {
    ClipboardList,
    UtensilsCrossed,
    CreditCard,
    Truck,
    Bike,
    BarChart3,
    Clock,
    Printer,
    Store,
} from 'lucide-react';

import { Title, NormalText } from '../../../styles/globalStyles';

const menuItems = [
    { label: 'Pedidos', icon: ClipboardList, href: '/admin/pedidos' },
    { label: 'Produtos', icon: UtensilsCrossed, href: '/admin/produtos' },
    { label: 'Central de Pagamentos', icon: CreditCard, href: '/admin/pagamentos' },
    { label: 'Taxas de Entrega', icon: Truck, href: '/admin/taxas-entrega' },
    { label: 'Motoboys', icon: Bike, href: '/admin/motoboys' },
    { label: 'Relatórios', icon: BarChart3, href: '/admin/relatorios' },
    { label: 'Padrões de Horário', icon: Clock, href: '/admin/horarios' },
    { label: 'Impressão', icon: Printer, href: '/admin/impressao' },
];

export default function Sidebar() {
    const { url } = usePage();

    return (
        <aside className="adminSidebar">
            <div className="sidebarBrand">
                <div className="sidebarBrandIcon">
                    <Store size={20} color="var(--white)" />
                </div>

                <div className="sidebarBrandText">
                    <Title fontSize="1.5rem" color="var(--white)">Maia Lanches</Title>
                    <NormalText fontSize="1.1rem" color="var(--gray-border-darker)">
                        Painel administrativo
                    </NormalText>
                </div>
            </div>

            <nav className="sidebarNav">
                {menuItems.map(({ label, icon: Icon, href }) => {
                    const isActive = url.startsWith(href);

                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`sidebarNavItem ${isActive ? 'active' : ''}`}
                        >
                            <Icon size={18} />
                            <span>{label}</span>
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}