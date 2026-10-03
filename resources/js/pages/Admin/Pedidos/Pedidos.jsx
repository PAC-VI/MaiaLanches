import './Pedidos.css';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { mockOrders, orderStatusConfig } from '../../../mocks/ordersMock';

import AdminLayout from '../../../layouts/AdminLayout/AdminLayout';
import AdminPageHeader from '../../../components/AdminPageHeader/AdminPageHeader';
import Button from '../../../components/Button/Button';
import SearchBar from '../../../components/SearchBar/SearchBar';
import StatusFilterCard from '../../../components/StatusFilterCard/StatusFilterCard';
import OrdersTable from '../../../components/OrdersTable/OrdersTable';

export default function Pedidos() {
    const [search, setSearch] = useState('');
    const [showConcluded, setShowConcluded] = useState(false);
    const [viewMode, setViewMode] = useState('todos'); // 'todos' | 'etapa'
    const [activeStatus, setActiveStatus] = useState(orderStatusConfig[0].key);

    // Cards visíveis: o de "Concluído" só aparece quando o toggle está ativo
    const visibleStatusCards = orderStatusConfig.filter(
        (status) => status.key !== 'concluido' || showConcluded
    );

    const handleSelectStatus = (statusKey) => {
        setActiveStatus(statusKey);
        setViewMode('etapa');
    };

    const handleToggleViewMode = () => {
        setViewMode((prev) => (prev === 'todos' ? 'etapa' : 'todos'));
    };

    const handleToggleConcluded = () => {
        setShowConcluded((prev) => !prev);
    };

    // Base: respeita o toggle de concluídos e a busca por cliente/nº do pedido/itens
    const searchedOrders = mockOrders
        .filter((order) => showConcluded || order.status !== 'concluido')
        .filter((order) => {
            const term = search.toLowerCase();
            return (
                String(order.id).includes(term) ||
                order.client.toLowerCase().includes(term) ||
                order.items.toLowerCase().includes(term)
            );
        });

    // Pedidos efetivamente exibidos na tabela, de acordo com o modo de visualização
    const tableOrders =
        viewMode === 'todos'
            ? searchedOrders
            : searchedOrders.filter((order) => order.status === activeStatus);

    const tableHeading =
        viewMode === 'todos'
            ? 'Todos os pedidos'
            : orderStatusConfig.find((status) => status.key === activeStatus)?.label;

    return (
        <AdminLayout>
            <div className="pedidosApp">
                <AdminPageHeader
                    title="Pedidos"
                    subtitle="Acompanhe a jornada de cada pedido por etapa."
                >
                    <Button variant="solid-danger" onClick={handleToggleViewMode}>
                        {viewMode === 'todos' ? 'Ver por etapa' : 'Ver todos os pedidos'}
                    </Button>
                </AdminPageHeader>

                <div className="pedidosFilters">
                    <SearchBar
                        value={search}
                        onChange={setSearch}
                        placeholder="Pesquisar pedidos..."
                    />

                    <Button
                        variant="outline-neutral"
                        icon={showConcluded ? <Eye size={16} /> : <EyeOff size={16} />}
                        onClick={handleToggleConcluded}
                    >
                        {showConcluded ? 'Exibindo concluídos' : 'Ocultar pedidos concluídos'}
                    </Button>
                </div>

                <div className="pedidosStatusCards">
                    {visibleStatusCards.map((status) => (
                        <StatusFilterCard
                            key={status.key}
                            label={status.label}
                            badgeVariant={status.badgeVariant}
                            count={mockOrders.filter((order) => order.status === status.key).length}
                            isActive={viewMode === 'etapa' && activeStatus === status.key}
                            onClick={() => handleSelectStatus(status.key)}
                        />
                    ))}
                </div>

                <OrdersTable heading={tableHeading} orders={tableOrders} />
            </div>
        </AdminLayout>
    );
}