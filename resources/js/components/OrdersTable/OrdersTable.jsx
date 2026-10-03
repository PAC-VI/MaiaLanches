import './OrdersTable.css';
import { Title, NormalText } from '../../../styles/globalStyles';
import AdminCard from '../AdminCard/AdminCard';
import Badge from '../Badge/Badge';

export default function OrdersTable({ heading, orders }) {
    return (
        <AdminCard>
            <div className="ordersTableHeader">
                <Title fontSize="1.5rem">{heading}</Title>
                <NormalText fontSize="1.2rem">
                    {orders.length} resultado{orders.length !== 1 ? 's' : ''}
                </NormalText>
            </div>

            <div className="ordersTableScroll">
                <table className="ordersTable">
                    <thead>
                        <tr>
                            <th>Pedido</th>
                            <th>Cliente</th>
                            <th>Itens</th>
                            <th>Tipo</th>
                            <th>Pagamento</th>
                            <th>Hora</th>
                            <th className="alignRight">Total</th>
                        </tr>
                    </thead>

                    <tbody>
                        {orders.map((order) => (
                            <tr key={order.id}>
                                <td className="orderIdCell">#{order.id}</td>
                                <td className="orderClientCell">{order.client}</td>
                                <td className="orderItemsCell">{order.items}</td>
                                <td>
                                    <Badge variant={order.type === 'Entrega' ? 'red' : 'green'}>
                                        {order.type}
                                    </Badge>
                                </td>
                                <td>{order.payment}</td>
                                <td>{order.time}</td>
                                <td className="alignRight orderTotalCell">
                                    R$ {order.total.toFixed(2).replace('.', ',')}
                                </td>
                            </tr>
                        ))}

                        {orders.length === 0 && (
                            <tr>
                                <td colSpan={7} className="ordersEmptyRow">
                                    Nenhum pedido encontrado.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </AdminCard>
    );
}