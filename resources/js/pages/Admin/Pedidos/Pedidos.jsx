import './Pedidos.css';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

import AdminPageHeader from '../../../components/AdminPageHeader/AdminPageHeader';
import Button from '../../../components/Button/Button';
import FormField from '../../../components/FormField/FormField';
import SearchBar from '../../../components/SearchBar/SearchBar';
import StatusFilterCard from '../../../components/StatusFilterCard/StatusFilterCard';
import OrdersTable from '../../../components/OrdersTable/OrdersTable';
import { NormalText } from '../../../../styles/globalStyles';

import { apiFetch } from '../../../lib/adminApi';
import { translateApiError } from '../../../lib/apiErrors';
import { formatDateTime, formatPrice, formatTime } from '../../../lib/format';
import { usePolling } from '../../../lib/usePolling';
import { addCalendarDays, dayKeyInSaoPaulo } from '../../../lib/reports';
import {
    ORDER_STATUSES,
    TYPE_LABELS,
    PAYMENT_LABELS,
    canCancelOrder,
    getStatusMeta,
    isClosedStatus,
    nextStatus,
} from '../../../lib/orderStatus';

const PERIOD_OPTIONS = [
    { key: 'hoje', label: 'Hoje' },
    { key: 'ontem', label: 'Ontem' },
    { key: '7dias', label: '7 dias' },
    { key: 'personalizado', label: 'Personalizado' },
];

function formatItemsLabel(items) {
    return (items ?? [])
        .map((item) => {
            const size =
                item.size_name && item.size_name !== 'Único' ? ` (${item.size_name})` : '';
            return `${item.quantity}x ${item.product_name}${size}`;
        })
        .join(', ');
}

function formatOrderMoment(iso) {
    const day = dayKeyInSaoPaulo(new Date(iso));
    const today = dayKeyInSaoPaulo(new Date());

    if (day && today && day !== today) {
        return formatDateTime(iso);
    }

    return formatTime(iso);
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
        time: formatOrderMoment(order.created_at),
        totalLabel: formatPrice(order.total_amount),
        actionLabel: statusMeta?.actionLabel ?? null,
    };
}

function inclusiveDayCount(from, to) {
    const [fromYear, fromMonth, fromDay] = from.split('-').map(Number);
    const [toYear, toMonth, toDay] = to.split('-').map(Number);
    const start = Date.UTC(fromYear, fromMonth - 1, fromDay);
    const end = Date.UTC(toYear, toMonth - 1, toDay);

    return Math.round((end - start) / 86400000) + 1;
}

function describePeriod(preset, customFrom, customTo) {
    const today = dayKeyInSaoPaulo(new Date());

    if (!today) {
        return { error: 'Não foi possível determinar o dia de hoje.' };
    }

    let from = today;
    let to = today;

    if (preset === 'ontem') {
        from = addCalendarDays(today, -1);
        to = from;
    } else if (preset === '7dias') {
        from = addCalendarDays(today, -6);
        to = today;
    } else if (preset === 'personalizado') {
        from = customFrom;
        to = customTo;

        if (!from || !to) {
            return { error: 'Informe o início e o fim do período.' };
        }
    }

    if (from > to) {
        return { error: 'A data inicial não pode ser maior que a data final.' };
    }

    if (inclusiveDayCount(from, to) > 92) {
        return { error: 'O intervalo máximo é de 92 dias.' };
    }

    const params = new URLSearchParams({ from, to });

    if (from <= today && today <= to) {
        params.set('include_open', '1');
    }

    return { path: `/orders?${params.toString()}` };
}

export default function Pedidos() {
    const [orders, setOrders] = useState([]);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [periodError, setPeriodError] = useState(null);
    const [advancingIds, setAdvancingIds] = useState([]);
    const [actionError, setActionError] = useState(null);

    const [search, setSearch] = useState('');
    const [showConcluded, setShowConcluded] = useState(false);
    const [viewMode, setViewMode] = useState('todos');
    const [activeStatus, setActiveStatus] = useState(ORDER_STATUSES[0].key);
    const [preset, setPreset] = useState('hoje');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');

    const mountedRef = useRef(true);
    const requestIdRef = useRef(0);
    const selectionRef = useRef({ preset, customFrom, customTo });
    selectionRef.current = { preset, customFrom, customTo };

    const loadOrders = useCallback(async () => {
        const requestId = ++requestIdRef.current;
        const { preset: currentPreset, customFrom: currentFrom, customTo: currentTo } = selectionRef.current;
        const period = describePeriod(currentPreset, currentFrom, currentTo);

        const isCurrent = () => mountedRef.current && requestId === requestIdRef.current;

        if (period.error) {
            if (!isCurrent()) {
                return;
            }

            setPeriodError(period.error);
            setOrders([]);
            setLoadError(null);
            setIsInitialLoading(false);
            return;
        }

        try {
            const response = await apiFetch(period.path);

            if (!isCurrent()) {
                return;
            }

            const list = response.data ?? response;
            setOrders(Array.isArray(list) ? list : []);
            setLoadError(null);
            setPeriodError(null);
        } catch (err) {
            if (!isCurrent()) {
                return;
            }

            setLoadError(translateApiError(err));
        } finally {
            if (isCurrent()) {
                setIsInitialLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        loadOrders();
    }, [preset, customFrom, customTo, loadOrders]);

    usePolling(loadOrders, 15000);

    const visibleStatusCards = ORDER_STATUSES.filter(
        (status) => !isClosedStatus(status.key) || showConcluded
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

        if (showConcluded && isClosedStatus(activeStatus)) {
            setViewMode('todos');
        }
    };

    const handleSelectPreset = (key) => {
        setPreset(key);

        if (key === 'personalizado') {
            const today = dayKeyInSaoPaulo(new Date());

            if (today) {
                setCustomFrom((current) => current || today);
                setCustomTo((current) => current || today);
            }
        }
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
                message: translateApiError(err),
            });
        } finally {
            setAdvancingIds((prev) => prev.filter((id) => id !== order.id));
        }
    };

    const handleCancelOrder = async (order) => {
        if (!canCancelOrder(order.status)) {
            return;
        }

        const confirmed = window.confirm(
            `Cancelar o pedido ${order.number}? Essa ação não pode ser desfeita.`
        );

        if (!confirmed) {
            return;
        }

        setAdvancingIds((prev) => (prev.includes(order.id) ? prev : [...prev, order.id]));
        setActionError(null);

        try {
            const response = await apiFetch(`/orders/${order.id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'cancelado' }),
            });
            const updated = response.data ?? response;
            setOrders((prev) => prev.map((item) => (item.id === order.id ? { ...item, ...updated } : item)));
        } catch (err) {
            setActionError({
                orderId: order.id,
                message: translateApiError(err),
            });
        } finally {
            setAdvancingIds((prev) => prev.filter((id) => id !== order.id));
        }
    };

    const mappedOrders = orders.map(mapOrder);

    const searchedOrders = mappedOrders
        .filter((order) => showConcluded || !isClosedStatus(order.status))
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

                <div className="pedidosPeriod">
                    <div className="pedidosPeriodOptions">
                        {PERIOD_OPTIONS.map((option) => (
                            <button
                                key={option.key}
                                type="button"
                                className={preset === option.key ? 'pedidosPeriodOptionActive' : ''}
                                onClick={() => handleSelectPreset(option.key)}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>

                    {preset === 'personalizado' && (
                        <div className="pedidosPeriodDates">
                            <FormField label="De" type="date" value={customFrom} onChange={setCustomFrom} />
                            <FormField label="Até" type="date" value={customTo} onChange={setCustomTo} />
                        </div>
                    )}
                </div>

                {periodError && (
                    <NormalText fontSize="1.3rem" color="var(--main-red)">
                        {periodError}
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
                        {showConcluded ? 'Exibindo concluídos e cancelados' : 'Ocultar concluídos e cancelados'}
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
                        onCancelOrder={handleCancelOrder}
                    />
                )}
            </div>
    );
}
