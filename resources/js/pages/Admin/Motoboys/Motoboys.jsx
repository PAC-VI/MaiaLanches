import './Motoboys.css';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { Title, NormalText } from '../../../../styles/globalStyles';
import { apiFetch } from '../../../lib/adminApi';
import { translateApiError } from '../../../lib/apiErrors';
import { formatPrice } from '../../../lib/format';
import { usePolling } from '../../../lib/usePolling';

import AdminPageHeader from '../../../components/AdminPageHeader/AdminPageHeader';
import AdminCard from '../../../components/AdminCard/AdminCard';
import SectionLabel from '../../../components/SectionLabel/SectionLabel';
import Button from '../../../components/Button/Button';
import MotoboyListItem from '../../../components/MotoboyListItem/MotoboyListItem';
import StatCard from '../../../components/StatCard/StatCard';
import DeliveryOrderRow from '../../../components/DeliveryOrderRow/DeliveryOrderRow';
import Badge from '../../../components/Badge/Badge';
import MotoboyFormModal from '../../../components/MotoboyFormModal/MotoboyFormModal';

function badgeVariant(statusLabel) {
    if (statusLabel === 'Em rota') {
        return 'yellow';
    }

    if (statusLabel === 'Disponível') {
        return 'green';
    }

    return 'neutral';
}

function orderStatusView(status) {
    if (status === 'entregue') {
        return { label: 'Entregue', variant: 'green' };
    }

    return { label: 'Em rota', variant: 'yellow' };
}

export default function Motoboys() {
    const [motoboys, setMotoboys] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [actionError, setActionError] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [summary, setSummary] = useState(null);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryError, setSummaryError] = useState(null);
    const [motoboyForm, setMotoboyForm] = useState(null);

    const mountedRef = useRef(true);
    const listRequestRef = useRef(0);
    const summaryRequestRef = useRef(0);
    const selectedIdRef = useRef(selectedId);
    selectedIdRef.current = selectedId;

    const loadMotoboys = useCallback(async () => {
        const requestId = ++listRequestRef.current;

        try {
            const data = await apiFetch('/admin/motoboys');

            if (!mountedRef.current || requestId !== listRequestRef.current) {
                return [];
            }

            const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
            setMotoboys(list);
            setLoadError(null);
            return list;
        } catch (err) {
            if (!mountedRef.current || requestId !== listRequestRef.current) {
                return [];
            }

            setLoadError(translateApiError(err));
            return [];
        } finally {
            if (mountedRef.current && requestId === listRequestRef.current) {
                setIsInitialLoading(false);
            }
        }
    }, []);

    const loadSummary = useCallback(async (motoboyId, { silent = false } = {}) => {
        if (motoboyId == null) {
            return;
        }

        const requestId = ++summaryRequestRef.current;

        if (!silent) {
            setSummary(null);
            setSummaryLoading(true);
            setSummaryError(null);
        }

        try {
            const data = await apiFetch(`/admin/motoboys/${motoboyId}/summary`);

            if (!mountedRef.current || requestId !== summaryRequestRef.current) {
                return;
            }

            setSummary(data);
            setSummaryError(null);
        } catch (err) {
            if (!mountedRef.current || requestId !== summaryRequestRef.current) {
                return;
            }

            if (!silent) {
                setSummary(null);
                setSummaryError(translateApiError(err));
            }
        } finally {
            if (mountedRef.current && requestId === summaryRequestRef.current) {
                setSummaryLoading(false);
            }
        }
    }, []);

    const refresh = useCallback(async () => {
        await loadMotoboys();

        const motoboyId = selectedIdRef.current;

        if (motoboyId != null) {
            await loadSummary(motoboyId, { silent: true });
        }
    }, [loadMotoboys, loadSummary]);

    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;
        };
    }, []);

    usePolling(refresh, 15000);

    useEffect(() => {
        if (motoboys.length === 0) {
            setSelectedId(null);
            return;
        }

        setSelectedId((current) => (
            motoboys.some((motoboy) => motoboy.id === current) ? current : motoboys[0].id
        ));
    }, [motoboys]);

    useEffect(() => {
        if (selectedId == null) {
            setSummary(null);
            setSummaryError(null);
            setSummaryLoading(false);
            return undefined;
        }

        loadSummary(selectedId);

        return () => {
            summaryRequestRef.current += 1;
        };
    }, [selectedId, loadSummary]);

    const selectedMotoboy = motoboys.find((motoboy) => motoboy.id === selectedId) ?? null;

    const handleSaved = async (saved) => {
        setMotoboyForm(null);
        await loadMotoboys();

        if (saved?.id) {
            setSelectedId(saved.id);
        }
    };

    const handleDelete = async () => {
        if (!selectedMotoboy || isDeleting) {
            return;
        }

        const confirmed = window.confirm(`Excluir o motoboy ${selectedMotoboy.name}?`);

        if (!confirmed) {
            return;
        }

        setActionError(null);
        setIsDeleting(true);

        try {
            await apiFetch(`/admin/motoboys/${selectedMotoboy.id}`, { method: 'DELETE' });

            if (!mountedRef.current) {
                return;
            }

            await loadMotoboys();
        } catch (err) {
            if (mountedRef.current) {
                setActionError(translateApiError(err));
            }
        } finally {
            if (mountedRef.current) {
                setIsDeleting(false);
            }
        }
    };

    const deliveriesValue = summaryError ? '—' : (summary ? summary.deliveries_count : '...');
    const payoutValue = summaryError ? '—' : (summary ? formatPrice(summary.payout_total) : '...');
    const averageValue = summaryError ? '—' : (summary ? formatPrice(summary.average_per_delivery) : '...');
    const summaryOrders = summary?.orders ?? [];

    return (
        <div className="motoboysApp">
            <AdminPageHeader
                title="Motoboys"
                subtitle="Entregadores cadastrados e desempenho do dia."
            >
                <Button
                    variant="solid-success"
                    icon={<Plus size={16} />}
                    onClick={() => setMotoboyForm({ motoboy: null })}
                >
                    Novo motoboy
                </Button>
            </AdminPageHeader>

            {actionError && (
                <NormalText fontSize="1.3rem" color="var(--main-red)">{actionError}</NormalText>
            )}

            <div className="motoboysGrid">
                <AdminCard>
                    <SectionLabel>Entregadores</SectionLabel>

                    <div className="motoboysList">
                        {isInitialLoading && (
                            <NormalText fontSize="1.3rem" className="motoboyNoOrders">
                                Carregando motoboys...
                            </NormalText>
                        )}

                        {!isInitialLoading && loadError && (
                            <>
                                <NormalText fontSize="1.3rem" color="var(--main-red)">{loadError}</NormalText>
                                <Button variant="outline-success" onClick={() => loadMotoboys()}>
                                    Tentar de novo
                                </Button>
                            </>
                        )}

                        {!isInitialLoading && !loadError && motoboys.length === 0 && (
                            <NormalText fontSize="1.3rem" className="motoboyNoOrders">
                                Nenhum motoboy cadastrado.
                            </NormalText>
                        )}

                        {!isInitialLoading && motoboys.map((motoboy) => (
                            <MotoboyListItem
                                key={motoboy.id}
                                name={motoboy.name.toUpperCase()}
                                phone={motoboy.phone}
                                statusLabel={motoboy.status_label}
                                badgeVariant={badgeVariant(motoboy.status_label)}
                                isActive={motoboy.id === selectedId}
                                onClick={() => setSelectedId(motoboy.id)}
                            />
                        ))}
                    </div>
                </AdminCard>

                <div className="motoboysDetails">
                    {!selectedMotoboy && !loadError && (
                        <AdminCard>
                            <NormalText fontSize="1.3rem" className="motoboyNoOrders">
                                {isInitialLoading ? 'Carregando...' : 'Nenhum motoboy cadastrado.'}
                            </NormalText>
                        </AdminCard>
                    )}

                    {selectedMotoboy && (
                        <>
                            <AdminCard>
                                <div className="motoboyDetailHeader">
                                    <div className="motoboyDetailHeaderText">
                                        <Title fontSize="1.8rem">{selectedMotoboy.name.toUpperCase()}</Title>
                                        <NormalText fontSize="1.3rem">{selectedMotoboy.phone}</NormalText>
                                    </div>

                                    <div className="motoboyDetailHeaderActions">
                                        <Badge variant={badgeVariant(selectedMotoboy.status_label)}>
                                            {selectedMotoboy.status_label}
                                        </Badge>
                                        <div className="motoboyDetailButtons">
                                            <Button
                                                variant="outline-neutral"
                                                disabled={isDeleting}
                                                onClick={() => setMotoboyForm({ motoboy: selectedMotoboy })}
                                            >
                                                Editar
                                            </Button>
                                            <Button
                                                variant="solid-danger"
                                                disabled={isDeleting}
                                                onClick={handleDelete}
                                            >
                                                {isDeleting ? 'Excluindo...' : 'Excluir'}
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="motoboyStats">
                                    <StatCard label="Entregas hoje" value={deliveriesValue} />
                                    <StatCard label="Repasse acumulado" value={payoutValue} />
                                    <StatCard label="Média por entrega" value={averageValue} />
                                </div>
                            </AdminCard>

                            <AdminCard>
                                <SectionLabel>Pedidos do entregador</SectionLabel>

                                {summaryLoading && !summary && (
                                    <NormalText fontSize="1.3rem" className="motoboyNoOrders">
                                        Carregando desempenho...
                                    </NormalText>
                                )}

                                {summaryError && (
                                    <div className="motoboySummaryError">
                                        <NormalText fontSize="1.3rem" color="var(--main-red)">{summaryError}</NormalText>
                                        <Button
                                            variant="outline-success"
                                            onClick={() => loadSummary(selectedMotoboy.id)}
                                        >
                                            Tentar de novo
                                        </Button>
                                    </div>
                                )}

                                {summary && summaryOrders.map((order) => {
                                    const statusView = orderStatusView(order.status);

                                    return (
                                        <DeliveryOrderRow
                                            key={order.id}
                                            orderId={order.id}
                                            client={order.customer_name}
                                            location={order.address_summary || '—'}
                                            fee={Number(order.delivery_fee) || 0}
                                            statusLabel={statusView.label}
                                            badgeVariant={statusView.variant}
                                        />
                                    );
                                })}

                                {summary && summaryOrders.length === 0 && (
                                    <NormalText fontSize="1.3rem" className="motoboyNoOrders">
                                        Nenhum pedido no momento.
                                    </NormalText>
                                )}
                            </AdminCard>
                        </>
                    )}
                </div>
            </div>

            {motoboyForm && (
                <MotoboyFormModal
                    key={motoboyForm.motoboy?.id ?? 'new'}
                    isOpen
                    motoboy={motoboyForm.motoboy}
                    onClose={() => setMotoboyForm(null)}
                    onSaved={handleSaved}
                />
            )}
        </div>
    );
}
