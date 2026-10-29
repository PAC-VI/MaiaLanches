import './Pedidos.css';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

import AdminPageHeader from '../../../components/AdminPageHeader/AdminPageHeader';
import Button from '../../../components/Button/Button';
import SearchBar from '../../../components/SearchBar/SearchBar';
import StatusFilterCard from '../../../components/StatusFilterCard/StatusFilterCard';
import OrdersTable from '../../../components/OrdersTable/OrdersTable';
import { NormalText } from '../../../../styles/globalStyles';

import { apiFetch } from '../../../lib/adminApi';
import { formatPrice, formatTime } from '../../../lib/format';
import { usePolling } from '../../../lib/usePolling';
import {
    ORDER_STATUSES,
    TYPE_LABELS,
    PAYMENT_LABELS,
    getStatusMeta,
    nextStatus,
} from '../../../lib/orderStatus';

function formatItemsLabel(items) {
    return (items ?? [])
        .map((item) => {
            const size =
                item.size_name && item.size_name !== 'Único' ? ` (${item.size_name})` : '';
            return `${item.quantity}x ${item.product_name}${size}`;
        })
        .join(', ');
}

function mapOrder(order) {
    const statusMeta = getStatusMeta(order.status);

    return {
        ...order,
        number: `#${order.number}`,
        client: order.customer_name,
        itemsLabel: formatItemsLabel(order.items),
        typeLabel: TYPE_LABELS[order.type] ?? order.type,
        paymentLabel: PAYMENT_LABELS[order.payment_method] ?? order.payment_method,
        time: formatTime(order.created_at),
        totalLabel: formatPrice(order.total_amount),
        actionLabel: statusMeta?.actionLabel ?? null,
    };
}

function errorMessage(err, fallback) {
    if (err?.status === 419) {
        return 'Sessão expirada. Recarregue a página.';
    }
    return fallback;
}

export default function Pedidos() {
    const [orders, setOrders] = useState([]);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [advancingIds, setAdvancingIds] = useState([]);
    const [actionError, setActionError] = useState(null);

    const [search, setSearch] = useState('');
    const [showConcluded, setShowConcluded] = useState(false);
    const [viewMode, setViewMode] = useState('todos');
    const [activeStatus, setActiveStatus] = useState(ORDER_STATUSES[0].key);

    const loadOrders = async () => {
        try {
            const response = await apiFetch('/orders');
            const list = response.data ?? response;
            setOrders(Array.isArray(list) ? list : []);
            setLoadError(null);
        } catch (err) {
            setLoadError(errorMessage(err, 'Não foi possível carregar os pedidos agora.'));
        } finally {
            setIsInitialLoading(false);
        }
    };

    usePolling(loadOrders, 15000);

    const visibleStatusCards = ORDER_STATUSES.filter(
        (status) => status.key !== 'entregue' || showConcluded
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

    const handleAdvanceStatus = async (order) => {
        const next = nextStatus(order.status);
        if (!next) {
            return;
        }

        setAdvancingIds((prev) => (prev.includes(order.id) ? prev : [...prev, order.id]));
        setActionError(null);

        try {
            const response = await apiFetch(`/orders/${order.id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: next }),
            });
            const updated = response.data ?? response;
            setOrders((prev) => prev.map((item) => (item.id === order.id ? { ...item, ...updated } : item)));
        } catch (err) {
            setActionError({
                orderId: order.id,
                message: errorMessage(err, 'Não foi possível atualizar o status do pedido.'),
            });
        } finally {
            setAdvancingIds((prev) => prev.filter((id) => id !== order.id));
        }
    };

    const mappedOrders = orders.map(mapOrder);

    const searchedOrders = mappedOrders
        .filter((order) => showConcluded || order.status !== 'entregue')
        .filter((order) => {
            const term = search.toLowerCase();
            return (
                order.number.toLowerCase().includes(term) ||
                order.client.toLowerCase().includes(term) ||
                order.itemsLabel.toLowerCase().includes(term)
            );
        });

    const tableOrders =
        viewMode === 'todos'
            ? searchedOrders
            : searchedOrders.filter((order) => order.status === activeStatus);

    const tableHeading =
        viewMode === 'todos'
            ? 'Todos os pedidos'
            : ORDER_STATUSES.find((status) => status.key === activeStatus)?.label;

    return (
            <div className="pedidosApp">
                <AdminPageHeader
                    title="Pedidos"
                    subtitle="Acompanhe a jornada de cada pedido por etapa."
                >
                    <Button variant="solid-danger" onClick={handleToggleViewMode}>
                        {viewMode === 'todos' ? 'Ver por etapa' : 'Ver todos os pedidos'}
                    </Button>
                </AdminPageHeader>

                {loadError && (
                    <NormalText fontSize="1.3rem" color="var(--main-red)">
                        {loadError}
                    </NormalText>
                )}

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
                            count={orders.filter((order) => order.status === status.key).length}
                            isActive={viewMode === 'etapa' && activeStatus === status.key}
                            onClick={() => handleSelectStatus(status.key)}
                        />
                    ))}
                </div>

                {isInitialLoading ? (
                    <NormalText fontSize="1.3rem">Carregando pedidos...</NormalText>
                ) : (
                    <OrdersTable
                        heading={tableHeading}
                        orders={tableOrders}
                        advancingIds={advancingIds}
                        actionError={actionError}
                        onAdvanceStatus={handleAdvanceStatus}
                    />
                )}
            </div>
    );
}
