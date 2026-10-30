import { Fragment, useState } from 'react';

import './OrdersTable.css';
import { Title, NormalText } from '../../../styles/globalStyles';
import AdminCard from '../AdminCard/AdminCard';
import Badge from '../Badge/Badge';
import Button from '../Button/Button';
import { formatPrice } from '../../lib/format';
import { canCancelOrder } from '../../lib/orderStatus';

function canAssignMotoboy(order) {
    return order.type === 'delivery'
        && order.status !== 'entregue'
        && order.status !== 'cancelado';
}

function motoboyOptions(motoboys, order) {
    const active = motoboys.filter((motoboy) => motoboy.is_active);

    if (
        order.motoboy_id != null
        && !active.some((motoboy) => motoboy.id === order.motoboy_id)
    ) {
        active.unshift({
            id: order.motoboy_id,
            name: order.motoboy_name || 'Motoboy atual',
        });
    }

    return active;
}

export default function OrdersTable({
    heading,
    orders,
    advancingIds = [],
    actionError,
    onAdvanceStatus,
    onCancelOrder,
    motoboys = [],
    motoboysError = null,
    assigningIds = [],
    motoboyError = null,
    onAssignMotoboy,
}) {
    const [expandedId, setExpandedId] = useState(null);

    const handleToggleRow = (orderId) => {
        setExpandedId((prev) => (prev === orderId ? null : orderId));
    };

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
                            <th>Ação</th>
                        </tr>
                    </thead>

                    <tbody>
                        {orders.map((order) => {
                            const isExpanded = expandedId === order.id;
                            const isAdvancing = advancingIds.includes(order.id);
                            const rowError =
                                actionError?.orderId === order.id ? actionError.message : null;

                            return (
                                <Fragment key={order.id}>
                                    <tr
                                        className="ordersTableRow"
                                        onClick={() => handleToggleRow(order.id)}
                                    >
                                        <td className="orderIdCell">{order.number}</td>
                                        <td className="orderClientCell">{order.client}</td>
                                        <td className="orderItemsCell">{order.itemsLabel}</td>
                                        <td>
                                            <Badge variant={order.typeLabel === 'Entrega' ? 'red' : 'green'}>
                                                {order.typeLabel}
                                            </Badge>
                                        </td>
                                        <td>{order.paymentLabel}</td>
                                        <td>{order.time}</td>
                                        <td className="alignRight orderTotalCell">{order.totalLabel}</td>
                                        <td onClick={(event) => event.stopPropagation()}>
                                            {order.actionLabel ? (
                                                <div className="ordersTableAction">
                                                    <Button
                                                        variant="outline-neutral"
                                                        disabled={isAdvancing}
                                                        onClick={() => onAdvanceStatus?.(order)}
                                                    >
                                                        {order.actionLabel}
                                                    </Button>
                                                    {rowError && (
                                                        <span className="ordersTableActionError">{rowError}</span>
                                                    )}
                                                </div>
                                            ) : null}
                                        </td>
                                    </tr>
                                    {isExpanded && (
                                        <tr className="ordersTableDetailRow">
                                            <td colSpan={8}>
                                                <div className="ordersTableDetails">
                                                    <p>Telefone: {order.customer_phone}</p>
                                                    {order.type === 'delivery' && (
                                                        <p>Endereço: {order.delivery_address}</p>
                                                    )}
                                                    {order.type === 'delivery' && (
                                                        <div
                                                            className="ordersMotoboyField"
                                                            onClick={(event) => event.stopPropagation()}
                                                        >
                                                            {canAssignMotoboy(order) ? (
                                                                <>
                                                                    <p>Motoboy</p>
                                                                    <select
                                                                        value={order.motoboy_id == null ? '' : String(order.motoboy_id)}
                                                                        disabled={assigningIds.includes(order.id)}
                                                                        onChange={(event) => {
                                                                            const value = event.target.value;
                                                                            onAssignMotoboy?.(
                                                                                order,
                                                                                value === '' ? null : Number(value)
                                                                            );
                                                                        }}
                                                                    >
                                                                        <option value="">Nenhum</option>
                                                                        {motoboyOptions(motoboys, order).map((motoboy) => (
                                                                            <option key={motoboy.id} value={motoboy.id}>
                                                                                {motoboy.name}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                    {motoboysError && (
                                                                        <span className="ordersTableActionError">{motoboysError}</span>
                                                                    )}
                                                                    {motoboyError?.orderId === order.id && (
                                                                        <span className="ordersTableActionError">{motoboyError.message}</span>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <p>Motoboy: {order.motoboy_name || '—'}</p>
                                                            )}
                                                        </div>
                                                    )}
                                                    {order.payment_method === 'dinheiro' && (
                                                        <p>
                                                            Troco
                                                            {order.change_for
                                                                ? `: ${formatPrice(order.change_for)}`
                                                                : ': —'}
                                                        </p>
                                                    )}
                                                    {(order.items ?? []).map((item) => (
                                                        <div key={item.id} className="ordersTableItemDetail">
                                                            <p>
                                                                {item.quantity}x {item.product_name}
                                                                {item.size_name && item.size_name !== 'Único'
                                                                    ? ` (${item.size_name})`
                                                                    : ''}
                                                            </p>
                                                            {item.observation ? (
                                                                <p>Observação: {item.observation}</p>
                                                            ) : null}
                                                            {item.add_ons?.length > 0 ? (
                                                                <p>
                                                                    Acréscimos:{' '}
                                                                    {item.add_ons.map((addOn) => addOn.name).join(', ')}
                                                                </p>
                                                            ) : null}
                                                        </div>
                                                    ))}
                                                    {canCancelOrder(order.status) && (
                                                        <div
                                                            className="ordersTableCancel"
                                                            onClick={(event) => event.stopPropagation()}
                                                        >
                                                            <Button
                                                                variant="solid-danger"
                                                                disabled={isAdvancing}
                                                                onClick={() => onCancelOrder?.(order)}
                                                            >
                                                                Cancelar pedido
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            );
                        })}

                        {orders.length === 0 && (
                            <tr>
                                <td colSpan={8} className="ordersEmptyRow">
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
