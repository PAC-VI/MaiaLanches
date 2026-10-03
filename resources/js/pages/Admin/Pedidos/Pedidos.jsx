import { useEffect, useState } from 'react';
import AdminLayout from '../../../layouts/AdminLayout/AdminLayout';
import { apiFetch } from '../../../lib/adminApi';
import './Pedidos.css';

export default function Pedidos() {
    const [me, setMe] = useState(null);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let active = true;

        async function load() {
            try {
                const [meResponse, ordersResponse] = await Promise.all([
                    apiFetch('/admin/me'),
                    apiFetch('/orders'),
                ]);

                if (!active) return;

                setMe(meResponse.user);
                setOrders(ordersResponse.data ?? []);
            } catch (err) {
                if (!active) return;
                setError(err.message);
            } finally {
                if (active) setLoading(false);
            }
        }

        load();

        return () => {
            active = false;
        };
    }, []);

    return (
        <AdminLayout>
            <div className="pedidosApp">
                <div className="pedidosHeader">
                    <h1>Pedidos</h1>
                    {me && (
                        <p className="pedidosWelcome">
                            Logado como <strong>{me.name}</strong> ({me.email})
                        </p>
                    )}
                </div>

                {loading && <p>Carregando pedidos...</p>}

                {error && (
                    <p className="pedidosError">
                        Não foi possível carregar os pedidos: {error}
                    </p>
                )}

                {!loading && !error && orders.length === 0 && (
                    <p className="pedidosEmpty">Nenhum pedido ainda.</p>
                )}

                {!loading && !error && orders.length > 0 && (
                    <table className="pedidosTable">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Cliente</th>
                                <th>Telefone</th>
                                <th>Tipo</th>
                                <th>Status</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order) => (
                                <tr key={order.id}>
                                    <td>{order.daily_number ?? order.id}</td>
                                    <td>{order.customer_name}</td>
                                    <td>{order.customer_phone}</td>
                                    <td>{order.type}</td>
                                    <td>
                                        <span className={`pedidosStatus pedidosStatus--${order.status}`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td>
                                        {order.total_amount.toLocaleString('pt-BR', {
                                            style: 'currency',
                                            currency: 'BRL',
                                        })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </AdminLayout>
    );
}
