import './Impressao.css';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer } from 'lucide-react';

import AdminPageHeader from '../../../components/AdminPageHeader/AdminPageHeader';
import AdminCard from '../../../components/AdminCard/AdminCard';
import SectionLabel from '../../../components/SectionLabel/SectionLabel';
import Button from '../../../components/Button/Button';
import { NormalText } from '../../../../styles/globalStyles';

import { apiFetch } from '../../../lib/adminApi';
import { translateApiError } from '../../../lib/apiErrors';
import { formatDateTime, formatPrice } from '../../../lib/format';
import { usePolling } from '../../../lib/usePolling';
import { PAYMENT_LABELS, TYPE_LABELS } from '../../../lib/orderStatus';
import { dayKeyInSaoPaulo } from '../../../lib/reports';

const PRINT_PAGE_CSS = '@page { size: 80mm auto; margin: 4mm; }';
const POLL_MS = 15000;
const PRINTED_LIMIT = 20;

function unwrapOrders(payload) {
    const list = payload?.data ?? payload;
    return Array.isArray(list) ? list : [];
}

function createdTime(order) {
    const time = new Date(order.created_at).getTime();
    return Number.isNaN(time) ? 0 : time;
}

function isPrinted(order) {
    return order.is_printed === true || order.is_printed === 1;
}

function ordersPath() {
    const today = dayKeyInSaoPaulo(new Date());
    const params = new URLSearchParams({
        from: today,
        to: today,
        include_open: '1',
    });

    return `/orders?${params.toString()}`;
}

function splitOrders(orders) {
    const active = orders.filter((order) => order.status !== 'cancelado');

    const pending = active
        .filter((order) => !isPrinted(order) && order.status !== 'entregue')
        .sort((a, b) => createdTime(a) - createdTime(b));

    const printed = active
        .filter((order) => isPrinted(order))
        .sort((a, b) => createdTime(b) - createdTime(a))
        .slice(0, PRINTED_LIMIT);

    return { pending, printed };
}

function itemLine(item) {
    const size = item.size_name && item.size_name !== 'Único' ? ` (${item.size_name})` : '';
    return `${item.quantity}x ${item.product_name}${size}`;
}

function Comanda({ order }) {
    const typeLabel = TYPE_LABELS[order.type] ?? order.type;
    const paymentLabel = PAYMENT_LABELS[order.payment_method] ?? order.payment_method;
    const showChange = order.payment_method === 'dinheiro';

    return (
        <div className="comanda">
            <p className="comandaTitle">MAIA LANCHES</p>
            <p className="comandaCenter">Pedido #{order.number}</p>
            <p className="comandaCenter">{formatDateTime(order.created_at)}</p>

            <div className="comandaDivider" />

            <p>Cliente: {order.customer_name}</p>
            <p>Telefone: {order.customer_phone}</p>
            <p>Tipo: {typeLabel}</p>
            {order.type === 'delivery' && (
                <p>Endereço: {order.delivery_address || '—'}</p>
            )}

            <div className="comandaDivider" />

            {(order.items ?? []).map((item) => {
                const observation = String(item.observation ?? '').trim();

                return (
                    <div key={item.id} className="comandaItem">
                        <p>{itemLine(item)}</p>
                        {(item.add_ons ?? []).map((addOn) => (
                            <p key={addOn.id} className="comandaExtra">+ {addOn.name}</p>
                        ))}
                        {observation ? <p className="comandaObs">Obs: {observation}</p> : null}
                    </div>
                );
            })}

            <div className="comandaDivider" />

            <p>Pagamento: {paymentLabel}</p>
            {showChange && (
                <p>
                    Troco: {order.change_for != null && order.change_for !== ''
                        ? formatPrice(order.change_for)
                        : '—'}
                </p>
            )}
            <p>Taxa de entrega: {formatPrice(order.delivery_fee)}</p>
            <p className="comandaTotal">Total: {formatPrice(order.total_amount)}</p>
        </div>
    );
}

export default function Impressao() {
    const [orders, setOrders] = useState([]);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [actionError, setActionError] = useState(null);
    const [printJob, setPrintJob] = useState(null);

    const cancelledRef = useRef(false);
    const forcedPrintedRef = useRef(new Set());

    const applyPrintedFlag = (list) => list.map((order) => (
        forcedPrintedRef.current.has(order.id) ? { ...order, is_printed: true } : order
    ));

    const loadOrders = async () => {
        try {
            const response = await apiFetch(ordersPath());

            if (cancelledRef.current) {
                return;
            }

            setOrders(applyPrintedFlag(unwrapOrders(response)));
            setLoadError(null);
        } catch (err) {
            if (!cancelledRef.current) {
                setLoadError(translateApiError(err));
            }
        } finally {
            if (!cancelledRef.current) {
                setIsInitialLoading(false);
            }
        }
    };

    const markPrinted = async (orderId) => {
        forcedPrintedRef.current.add(orderId);
        setOrders((current) => current.map((order) => (
            order.id === orderId ? { ...order, is_printed: true } : order
        )));

        try {
            await apiFetch(`/orders/${orderId}/printed`, { method: 'PATCH' });
        } catch (err) {
            forcedPrintedRef.current.delete(orderId);

            if (cancelledRef.current) {
                return;
            }

            setOrders((current) => current.map((order) => (
                order.id === orderId ? { ...order, is_printed: false } : order
            )));
            setActionError(translateApiError(err));
        }
    };

    useEffect(() => {
        cancelledRef.current = false;

        const root = document.documentElement;
        root.dataset.page = 'impressao';

        const style = document.createElement('style');
        style.setAttribute('data-impressao-page', '');
        style.textContent = PRINT_PAGE_CSS;
        document.head.appendChild(style);

        return () => {
            cancelledRef.current = true;
            delete root.dataset.page;
            style.remove();
        };
    }, []);

    usePolling(loadOrders, POLL_MS);

    useEffect(() => {
        if (!printJob) {
            return undefined;
        }

        const { order, mark } = printJob;
        let settled = false;

        const handleAfterPrint = () => {
            if (settled) {
                return;
            }

            settled = true;
            window.removeEventListener('afterprint', handleAfterPrint);

            if (mark) {
                markPrinted(order.id);
            }

            if (!cancelledRef.current) {
                setPrintJob(null);
            }
        };

        window.addEventListener('afterprint', handleAfterPrint, { once: true });

        const timer = window.setTimeout(() => {
            window.print();
        }, 50);

        return () => {
            window.clearTimeout(timer);
            window.removeEventListener('afterprint', handleAfterPrint);
        };
    }, [printJob]);

    const requestPrint = (order, mark) => {
        if (printJob || order.status === 'cancelado') {
            return;
        }

        setActionError(null);
        setPrintJob({ order, mark });
    };

    const { pending, printed } = splitOrders(orders);
    const showSections = !isInitialLoading && !(loadError && orders.length === 0);

    return (
        <>
                <div className="impressaoApp">
                    <AdminPageHeader
                        title="Impressão"
                        subtitle="Imprima as comandas na ordem da cozinha."
                    />

                    {actionError && (
                        <NormalText fontSize="1.3rem" color="var(--main-red)">{actionError}</NormalText>
                    )}

                    {isInitialLoading && (
                        <NormalText fontSize="1.3rem">Carregando pedidos...</NormalText>
                    )}

                    {!isInitialLoading && loadError && (
                        <NormalText fontSize="1.3rem" color="var(--main-red)">{loadError}</NormalText>
                    )}

                    {showSections && (
                        <>
                            <AdminCard>
                                <SectionLabel>Aguardando impressão</SectionLabel>

                                {pending.length === 0 ? (
                                    <div className="impressaoEmpty">
                                        <NormalText fontSize="1.3rem">Nenhum pedido aguardando impressão</NormalText>
                                    </div>
                                ) : (
                                    pending.map((order) => (
                                        <div key={order.id} className="impressaoOrder">
                                            <Comanda order={order} />
                                            <div className="impressaoPrintAction">
                                                <Button
                                                    variant="solid-success"
                                                    icon={<Printer size={16} />}
                                                    onClick={() => requestPrint(order, true)}
                                                    disabled={printJob != null}
                                                >
                                                    Imprimir
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </AdminCard>

                            <AdminCard>
                                <SectionLabel>Já impressos</SectionLabel>

                                {printed.length === 0 ? (
                                    <div className="impressaoEmpty">
                                        <NormalText fontSize="1.3rem">Nenhum pedido impresso.</NormalText>
                                    </div>
                                ) : (
                                    printed.map((order) => (
                                        <div key={order.id} className="impressaoPrintedRow">
                                            <div className="impressaoPrintedInfo">
                                                <NormalText fontSize="1.4rem" fontWeight="700" color="var(--black)">
                                                    Pedido #{order.number}
                                                </NormalText>
                                                <NormalText fontSize="1.3rem">
                                                    {formatDateTime(order.created_at)}
                                                    {' · '}
                                                    {order.customer_name}
                                                    {' · '}
                                                    {TYPE_LABELS[order.type] ?? order.type}
                                                    {' · '}
                                                    {formatPrice(order.total_amount)}
                                                </NormalText>
                                            </div>
                                            <div className="impressaoPrintAction">
                                                <Button
                                                    variant="outline-neutral"
                                                    icon={<Printer size={16} />}
                                                    onClick={() => requestPrint(order, false)}
                                                    disabled={printJob != null}
                                                >
                                                    Reimprimir
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </AdminCard>
                        </>
                    )}
                </div>

            {typeof document !== 'undefined' && createPortal(
                <div id="comanda" aria-hidden="true">
                    {printJob ? <Comanda order={printJob.order} /> : null}
                </div>,
                document.body,
            )}
        </>
    );
}
