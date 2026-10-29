import './CentralDePagamentos.css';

import { useCallback, useEffect, useRef, useState } from 'react';

import AdminPageHeader from '../../../components/AdminPageHeader/AdminPageHeader';
import AdminCard from '../../../components/AdminCard/AdminCard';
import SectionLabel from '../../../components/SectionLabel/SectionLabel';
import ToggleRow from '../../../components/ToggleRow/ToggleRow';
import FormField from '../../../components/FormField/FormField';
import Button from '../../../components/Button/Button';
import { NormalText } from '../../../../styles/globalStyles';

import { apiFetch } from '../../../lib/adminApi';
import { translateApiError } from '../../../lib/apiErrors';

function unwrapList(payload) {
    const list = Array.isArray(payload) ? payload : (payload?.data ?? []);
    return list
        .map((method) => ({
            id: method.id,
            code: method.code,
            label: method.label,
            is_active: Boolean(method.is_active),
            sort_order: Number(method.sort_order) || 0,
        }))
        .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
}

function unwrapOne(payload) {
    const method = payload?.data && !Array.isArray(payload.data) ? payload.data : payload;
    return unwrapList([method])[0];
}

export default function CentralDePagamentos() {
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [actionError, setActionError] = useState(null);
    const [savingId, setSavingId] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [labelDraft, setLabelDraft] = useState('');
    const [editError, setEditError] = useState(null);
    const cancelledRef = useRef(false);

    const loadMethods = useCallback(async ({ silent = false } = {}) => {
        if (!silent) {
            setIsLoading(true);
        }

        setLoadError(null);

        try {
            const data = await apiFetch('/admin/payment-methods');

            if (cancelledRef.current) {
                return;
            }

            setPaymentMethods(unwrapList(data));
        } catch (err) {
            if (!cancelledRef.current) {
                setLoadError(translateApiError(err));
            }
        } finally {
            if (!cancelledRef.current && !silent) {
                setIsLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        cancelledRef.current = false;
        loadMethods();

        return () => {
            cancelledRef.current = true;
        };
    }, [loadMethods]);

    const handleToggle = async (method, value) => {
        if (savingId != null) {
            return;
        }

        setActionError(null);
        setSavingId(method.id);

        try {
            const updated = await apiFetch(`/admin/payment-methods/${method.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ is_active: value }),
            });

            if (cancelledRef.current) {
                return;
            }

            const saved = unwrapOne(updated);
            setPaymentMethods((prev) => prev.map((item) => (item.id === saved.id ? saved : item)));
        } catch (err) {
            if (!cancelledRef.current) {
                setActionError(translateApiError(err));
            }
        } finally {
            if (!cancelledRef.current) {
                setSavingId(null);
            }
        }
    };

    const handleEdit = (method) => {
        setEditingId(method.id);
        setLabelDraft(method.label);
        setEditError(null);
        setActionError(null);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setLabelDraft('');
        setEditError(null);
    };

    const handleSaveLabel = async () => {
        if (savingId != null || editingId == null) {
            return;
        }

        const label = labelDraft.trim();

        if (!label) {
            setEditError('O nome da forma de pagamento é obrigatório.');
            return;
        }

        if (label.length > 80) {
            setEditError('O nome pode ter no máximo 80 caracteres.');
            return;
        }

        setEditError(null);
        setActionError(null);
        setSavingId(editingId);

        try {
            const updated = await apiFetch(`/admin/payment-methods/${editingId}`, {
                method: 'PATCH',
                body: JSON.stringify({ label }),
            });

            if (cancelledRef.current) {
                return;
            }

            const saved = unwrapOne(updated);
            setPaymentMethods((prev) => prev.map((item) => (item.id === saved.id ? saved : item)));
            cancelEdit();
        } catch (err) {
            if (!cancelledRef.current) {
                setEditError(translateApiError(err));
            }
        } finally {
            if (!cancelledRef.current) {
                setSavingId(null);
            }
        }
    };

    const isBusy = savingId != null;

    return (
            <div className="centralDePagamentosApp">
                <AdminPageHeader
                    title="Central de Pagamentos"
                    subtitle="Formas de pagamento aceitas na loja."
                />

                <AdminCard>
                    <SectionLabel>Formas de pagamento</SectionLabel>

                    {isLoading && (
                        <div className="centralPagamentosState">
                            <NormalText fontSize="1.3rem">Carregando formas de pagamento...</NormalText>
                        </div>
                    )}

                    {!isLoading && loadError && (
                        <div className="centralPagamentosForm">
                            <NormalText fontSize="1.3rem" color="var(--main-red)">{loadError}</NormalText>
                            <div className="centralPagamentosFormActions">
                                <Button variant="outline-success" onClick={() => loadMethods()}>
                                    Tentar de novo
                                </Button>
                            </div>
                        </div>
                    )}

                    {!isLoading && !loadError && actionError && (
                        <div className="centralPagamentosState">
                            <NormalText fontSize="1.3rem" color="var(--main-red)">{actionError}</NormalText>
                        </div>
                    )}

                    {!isLoading && !loadError && isBusy && editingId == null && (
                        <div className="centralPagamentosState">
                            <NormalText fontSize="1.3rem">Salvando...</NormalText>
                        </div>
                    )}

                    {!isLoading && !loadError && editingId != null && (
                        <div className="centralPagamentosForm">
                            <FormField
                                label="Nome exibido"
                                value={labelDraft}
                                onChange={(value) => {
                                    setLabelDraft(value);
                                    setEditError(null);
                                }}
                                disabled={isBusy}
                            />

                            {editError && (
                                <NormalText fontSize="1.2rem" color="var(--main-red)">{editError}</NormalText>
                            )}

                            <div className="centralPagamentosFormActions">
                                <Button onClick={handleSaveLabel} disabled={isBusy}>
                                    {isBusy ? 'Salvando...' : 'Salvar nome'}
                                </Button>
                                <Button variant="outline-neutral" onClick={cancelEdit} disabled={isBusy}>
                                    Cancelar
                                </Button>
                            </div>
                        </div>
                    )}

                    {!isLoading && !loadError && paymentMethods.length === 0 && (
                        <div className="centralPagamentosState">
                            <NormalText fontSize="1.3rem">Nenhuma forma de pagamento cadastrada.</NormalText>
                        </div>
                    )}

                    {!isLoading && !loadError && paymentMethods.map((method) => (
                        <ToggleRow
                            key={method.id}
                            title={method.label}
                            checked={method.is_active}
                            disabled={isBusy}
                            onToggle={(value) => handleToggle(method, value)}
                            onEdit={() => handleEdit(method)}
                        />
                    ))}
                </AdminCard>
            </div>
    );
}
