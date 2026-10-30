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
import AddOnFormModal from '../AddOnFormModal/AddOnFormModal';

function unwrapList(payload) {
    const list = payload?.data;
    return Array.isArray(list) ? list : [];
}

export default function AddOnsSection() {
    const [addOns, setAddOns] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [actionError, setActionError] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
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

    const handleDelete = async (addOn) => {
        if (deletingId != null) {
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

            {!isLoading && !loadError && addOns.map((addOn) => (
                <div key={addOn.id} className="addOnRow">
                    <Title fontSize="1.4rem" fontWeight="600" className="addOnName">{addOn.name}</Title>
                    <div className="addOnRowActions">
                        <NormalText fontSize="1.3rem">{formatPrice(addOn.price)}</NormalText>
                        <IconButton
                            icon={<Pencil size={16} color="var(--gray)" />}
                            onClick={() => setForm({ addOn })}
                            title="Editar acréscimo"
                        />
                        <IconButton
                            icon={<Trash2 size={16} color="var(--gray)" />}
                            onClick={() => handleDelete(addOn)}
                            variant="danger"
                            title="Excluir acréscimo"
                        />
                    </div>
                </div>
            ))}

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
                    onClose={() => setForm(null)}
                    onSaved={handleSaved}
                />
            )}
        </AdminCard>
    );
}
