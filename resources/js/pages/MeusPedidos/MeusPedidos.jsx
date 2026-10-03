import { useCallback, useEffect, useState } from 'react';
import ClientLayout from '../../layouts/ClientLayout/ClientLayout';
import { getSavedOrders } from '../../lib/orderStorage';
import { pollOrderStatuses } from '../../lib/orderStatusPolling';
import './MeusPedidos.css';

const POLL_INTERVAL_MS = 20000;

const STATUS_LABELS = {
    novo: 'Novo',
    em_preparo: 'Em preparo',
    pronto: 'Pronto',
    entregue: 'Entregue',
};

export default function MeusPedidos() {
    const [orders, setOrders] = useState([]);

    const refresh = useCallback(() => {
        setOrders(getSavedOrders());
    }, []);

    useEffect(() => {
        refresh();

        const interval = setInterval(() => {
            pollOrderStatuses(refresh);
        }, POLL_INTERVAL_MS);

        return () => clearInterval(interval);
    }, [refresh]);

    return (
        <ClientLayout>
            <div className="meusPedidosApp">
                <h1>Meus Pedidos</h1>

                {orders.length === 0 && (
                    <p className="meusPedidosEmpty">
                        Nenhum pedido feito neste navegador ainda.
                    </p>
                )}

                {orders.length > 0 && (
                    <ul className="meusPedidosList">
                        {orders.map((order) => (
                            <li key={order.id} className="meusPedidosItem">
                                <span className="meusPedidosNumber">
                                    Pedido #{order.daily_number}
                                </span>
                                <span className={`meusPedidosStatus meusPedidosStatus--${order.status}`}>
                                    {STATUS_LABELS[order.status] ?? order.status}
                                </span>
                                <span className="meusPedidosTotal">
                                    {Number(order.total_amount).toLocaleString('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL',
                                    })}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </ClientLayout>
    );
}
