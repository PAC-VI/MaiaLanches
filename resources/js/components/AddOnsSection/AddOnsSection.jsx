import './AddOnsSection.css';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Title, NormalText } from '../../../styles/globalStyles';
import { apiFetch } from '../../lib/adminApi';
import { translateApiError } from '../../lib/apiErrors';
import { formatPrice } from '../../lib/format';

import AdminCard from '../AdminCard/AdminCard';
import SectionLabel from '../SectionLabel/SectionLabel';
import Button from '../Button/Button';
import IconButton from '../IconButton/IconButton';
import Toggle from '../Toggle/Toggle';
import AddOnFormModal from '../AddOnFormModal/AddOnFormModal';

function unwrapList(payload) {
    const list = payload?.data;
    return Array.isArray(list) ? list : [];
}

function categorySummary(addOn, categories) {
    const ids = Array.isArray(addOn.category_ids) ? addOn.category_ids.map(Number) : [];

    if (ids.length === 0) {
        return 'Não aparecerá em nenhum produto';
    }

    const names = ids
        .map((id) => categories.find((category) => Number(category.id) === id)?.name)
        .filter(Boolean);

    if (names.length === 0) {
        return categories.length === 0 ? '' : 'Não aparecerá em nenhum produto';
    }

    return names.join(', ');
}

export default function AddOnsSection({ categories = [] }) {
    const [addOns, setAddOns] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [actionError, setActionError] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [togglingId, setTogglingId] = useState(null);
    const [form, setForm] = useState(null);
    const cancelledRef = useRef(false);

    const loadAddOns = useCallback(async ({ silent = false } = {}) => {
        if (!silent) {
            setIsLoading(true);
        }

        setLoadError(null);

        try {
            const payload = await apiFetch('/add-ons');

            if (cancelledRef.current) {
                return;
            }

            setAddOns(unwrapList(payload));
        } catch (_) {
            if (!cancelledRef.current) {
                setLoadError('Não foi possível carregar os acréscimos agora.');
            }
        } finally {
            if (!cancelledRef.current && !silent) {
                setIsLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        cancelledRef.current = false;
        loadAddOns();

        return () => {
            cancelledRef.current = true;
        };
    }, [loadAddOns]);

    const handleSaved = async () => {
        setForm(null);
        await loadAddOns({ silent: true });
    };

    const handleToggle = async (addOn, value) => {
        if (togglingId != null || deletingId != null) {
            return;
        }

        setTogglingId(addOn.id);
        setActionError(null);

        try {
            await apiFetch(`/add-ons/${addOn.id}/availability`, {
                method: 'PATCH',
                body: JSON.stringify({ is_active: value }),
            });

            if (cancelledRef.current) {
                return;
            }

            setAddOns((current) => current.map((item) => (
                item.id === addOn.id ? { ...item, is_active: value } : item
            )));
        } catch (err) {
            if (!cancelledRef.current) {
                setActionError(translateApiError(err));
            }
        } finally {
            if (!cancelledRef.current) {
                setTogglingId(null);
            }
        }
    };

    const handleDelete = async (addOn) => {
        if (deletingId != null || addOn.can_delete === false) {
            return;
        }

        const confirmed = window.confirm(
            `Excluir ${addOn.name}?`
        );
        if (!confirmed) {
            return;
        }

        setDeletingId(addOn.id);
        setActionError(null);

        try {
            await apiFetch(`/add-ons/${addOn.id}`, { method: 'DELETE' });

            if (cancelledRef.current) {
                return;
            }

            if (form?.addOn?.id === addOn.id) {
                setForm(null);
            }

            await loadAddOns({ silent: true });
        } catch (err) {
            if (!cancelledRef.current) {
                setActionError(translateApiError(err));
            }
        } finally {
            if (!cancelledRef.current) {
                setDeletingId(null);
            }
        }
    };

    return (
        <AdminCard>
            <div className="addOnsSectionHeader">
                <SectionLabel>Acréscimos</SectionLabel>
                <Button
                    variant="solid-success"
                    icon={<Plus size={16} />}
                    onClick={() => setForm({ addOn: null })}
                    disabled={isLoading}
                >
                    Novo acréscimo
                </Button>
            </div>

            {isLoading && (
                <NormalText fontSize="1.3rem" className="addOnsStateText">
                    Carregando acréscimos...
                </NormalText>
            )}

            {!isLoading && loadError && (
                <div className="addOnsState">
                    <NormalText fontSize="1.3rem">{loadError}</NormalText>
                    <Button variant="outline-success" onClick={() => loadAddOns()}>
                        Tentar de novo
                    </Button>
                </div>
            )}

            {!isLoading && !loadError && addOns.length === 0 && (
                <NormalText fontSize="1.3rem" className="addOnsStateText">
                    Nenhum acréscimo cadastrado.
                </NormalText>
            )}

            {!isLoading && !loadError && addOns.map((addOn) => {
                const summary = categorySummary(addOn, categories);
                const summaryIsWarning = summary === 'Não aparecerá em nenhum produto';

                return (
                <div key={addOn.id} className="addOnRow">
                    <div className="addOnIdentity">
                        <Title fontSize="1.4rem" fontWeight="600" className="addOnName">{addOn.name}</Title>
                        {summary && (
                            <NormalText
                                fontSize="1.2rem"
                                className="addOnCategories"
                                color={summaryIsWarning ? 'var(--warning-yellow-text)' : 'var(--gray)'}
                            >
                                {summary}
                            </NormalText>
                        )}
                        {addOn.can_delete === false && (
                            <NormalText fontSize="1.2rem">Já teve vendas: apenas desative</NormalText>
                        )}
                    </div>
                    <div className="addOnRowActions">
                        <NormalText fontSize="1.3rem">{formatPrice(addOn.price)}</NormalText>
                        <Toggle
                            checked={addOn.is_active !== false}
                            disabled={togglingId === addOn.id || deletingId === addOn.id}
                            onChange={(value) => handleToggle(addOn, value)}
                        />
                        <IconButton
                            icon={<Pencil size={16} color="var(--gray)" />}
                            onClick={() => setForm({ addOn })}
                            title="Editar acréscimo"
                        />
                        <IconButton
                            icon={<Trash2 size={16} color="var(--gray)" />}
                            onClick={() => handleDelete(addOn)}
                            variant="danger"
                            disabled={deletingId != null || addOn.can_delete === false}
                            title={addOn.can_delete === false ? 'Já teve vendas: apenas desative' : 'Excluir acréscimo'}
                        />
                    </div>
                </div>
                );
            })}

            {actionError && (
                <NormalText fontSize="1.3rem" color="var(--main-red)" className="addOnsStateText">
                    {actionError}
                </NormalText>
            )}

            {form && (
                <AddOnFormModal
                    key={form.addOn?.id ?? 'new'}
                    isOpen
                    addOn={form.addOn}
                    categories={categories}
                    onClose={() => setForm(null)}
                    onSaved={handleSaved}
                />
            )}
        </AdminCard>
    );
}
