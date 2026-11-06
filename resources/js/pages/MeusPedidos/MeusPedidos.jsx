import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from '@inertiajs/react';
import ClientLayout from '../../layouts/ClientLayout/ClientLayout';
import StoreHeader from '../../components/StoreHeader/StoreHeader';
import { Title, NormalText } from '../../../styles/globalStyles';
import { formatPrice, formatTime } from '../../lib/format';
import { PAYMENT_LABELS } from '../../lib/orderStatus';
import { publicApiFetch } from '../../lib/publicApi';
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
    cancelado: 'Cancelado',
    nao_encontrado: 'Não encontrado',
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
        return `Pedido #${order.number}`;
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
    const [offline, setOffline] = useState(false);
    const [storeName, setStoreName] = useState('');
    const [storeAddress, setStoreAddress] = useState('');
    const mountedRef = useRef(true);

    const refresh = useCallback(() => {
        if (!mountedRef.current) {
            return;
        }

        setOrders(getSavedOrders());
    }, []);

    const syncStatuses = useCallback(async () => {
        try {
            const result = await pollOrderStatuses();

            if (!mountedRef.current || result?.skipped) {
                return;
            }

            setOffline(false);

            if (result?.changed) {
                refresh();
            }
        } catch (_) {
            if (mountedRef.current) {
                setOffline(true);
            }
        }
    }, [refresh]);

    useEffect(() => {
        mountedRef.current = true;
        refresh();

        return () => {
            mountedRef.current = false;
        };
    }, [refresh]);

    useEffect(() => {
        let cancelled = false;

        publicApiFetch('/store-settings')
            .then((data) => {
                if (cancelled || !data || typeof data !== 'object') {
                    return;
                }

                const name = typeof data.name === 'string' ? data.name.trim() : '';
                const address = typeof data.address === 'string' ? data.address.trim() : '';

                setStoreName(name);
                setStoreAddress(address);

                if (name) {
                    document.title = name;
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setStoreName('');
                    setStoreAddress('');
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    usePolling(() => {
        syncStatuses();
    }, POLL_INTERVAL_MS);

    return (
        <ClientLayout>
            <div className="meusPedidosPage">
                <StoreHeader name={storeName} address={storeAddress} />

                <div className="meusPedidosApp">
                    <Link href="/" className="meusPedidosBack">Voltar ao cardápio</Link>
                    <Title fontSize="2.2rem">Meus Pedidos</Title>

                    {offline && (
                        <NormalText fontSize="1.3rem" color="var(--main-red)">
                            Sem conexão, tentando de novo…
                        </NormalText>
                    )}

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
                                                        {kind} #{order.number}
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

                                        {order.payment_method && (
                                            <NormalText fontSize="1.3rem">
                                                {PAYMENT_LABELS[order.payment_method] ?? order.payment_method}
                                            </NormalText>
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
