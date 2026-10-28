import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from '@inertiajs/react';
import ClientLayout from '../../layouts/ClientLayout/ClientLayout';
import StoreHeader from '../../components/StoreHeader/StoreHeader';
import { Title, NormalText } from '../../../styles/globalStyles';
import { formatPrice, formatTime } from '../../lib/format';
import { getSavedOrders } from '../../lib/orderStorage';
import { pollOrderStatuses } from '../../lib/orderStatusPolling';
import { usePolling } from '../../lib/usePolling';
import './MeusPedidos.css';

const POLL_INTERVAL_MS = 20000;

const STATUS_LABELS = {
    novo: 'Novo',
    em_preparo: 'Em preparo',
    pronto: 'Pronto',
    entregue: 'Entregue',
};

const TYPE_LABELS = {
    delivery: 'Entrega',
    pickup: 'Retirada',
};

function orderClock(iso) {
    if (!iso || Number.isNaN(new Date(iso).getTime())) {
        return null;
    }

    return formatTime(iso);
}

function orderHeadline(order) {
    const items = order.items ?? [];

    if (items.length === 0) {
        return `Pedido nº ${order.daily_number}`;
    }

    const first = items[0].product_name;

    if (items.length === 1) {
        return first;
    }

    return `${first} e mais ${items.length - 1}`;
}

function itemLine(item) {
    const size = item.size_name && item.size_name !== 'Único' ? ` (${item.size_name})` : '';
    const addOns = item.add_ons?.length ? ` · ${item.add_ons.join(', ')}` : '';

    return `${item.quantity}× ${item.product_name}${size}${addOns}`;
}

export default function MeusPedidos() {
    const [orders, setOrders] = useState([]);
    const mountedRef = useRef(true);

    const refresh = useCallback(() => {
        if (!mountedRef.current) {
            return;
        }

        setOrders(getSavedOrders());
    }, []);

    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;

        refresh();
        pollOrderStatuses(() => {
            if (!cancelled) {
                refresh();
            }
        });

        return () => {
            cancelled = true;
        };
    }, [refresh]);

    usePolling(() => {
        pollOrderStatuses(() => {
            if (mountedRef.current) {
                refresh();
            }
        });
    }, POLL_INTERVAL_MS);

    return (
        <ClientLayout>
            <div className="meusPedidosPage">
                <StoreHeader />

                <div className="meusPedidosApp">
                    <Link href="/" className="meusPedidosBack">Voltar ao cardápio</Link>
                    <Title fontSize="2.2rem">Meus Pedidos</Title>

                    {orders.length === 0 && (
                        <NormalText className="meusPedidosEmpty" fontSize="1.4rem">
                            Nenhum pedido feito neste navegador ainda.
                        </NormalText>
                    )}

                    {orders.length > 0 && (
                        <ul className="meusPedidosList">
                            {orders.map((order) => {
                                const clock = orderClock(order.created_at);
                                const kind = TYPE_LABELS[order.type];
                                const items = order.items ?? [];

                                return (
                                    <li key={order.id} className="meusPedidosItem">
                                        <div className="meusPedidosItemTop">
                                            <div className="meusPedidosHeadingText">
                                                {kind && (
                                                    <NormalText fontSize="1.2rem" fontWeight="600">
                                                        {kind} nº {order.daily_number}
                                                    </NormalText>
                                                )}
                                                <Title fontSize="1.6rem">{orderHeadline(order)}</Title>
                                            </div>
                                            <span className={`meusPedidosStatus meusPedidosStatus--${order.status}`}>
                                                {STATUS_LABELS[order.status] ?? order.status}
                                            </span>
                                        </div>

                                        {items.length > 0 && (
                                            <ul className="meusPedidosItems">
                                                {items.map((item, index) => (
                                                    <li key={`${order.id}-${index}`} className="meusPedidosItemLine">
                                                        {itemLine(item)}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}

                                        <div className="meusPedidosMeta">
                                            <NormalText fontSize="1.3rem">
                                                {clock ?? '—'}
                                            </NormalText>
                                            <span className="meusPedidosTotal">
                                                {formatPrice(order.total_amount)}
                                            </span>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </ClientLayout>
    );
}
