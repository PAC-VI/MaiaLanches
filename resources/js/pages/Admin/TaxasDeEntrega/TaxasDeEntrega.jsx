import './TaxasDeEntrega.css';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { Title, NormalText } from '../../../../styles/globalStyles';
import { apiFetch } from '../../../lib/adminApi';
import { translateApiError } from '../../../lib/apiErrors';
import { formatPrice } from '../../../lib/format';

import AdminPageHeader from '../../../components/AdminPageHeader/AdminPageHeader';
import AdminCard from '../../../components/AdminCard/AdminCard';
import SectionLabel from '../../../components/SectionLabel/SectionLabel';
import FormField from '../../../components/FormField/FormField';
import Button from '../../../components/Button/Button';
import Toggle from '../../../components/Toggle/Toggle';
import DataListRow from '../../../components/DataListRow/DataListRow';

import '../../../components/ToggleRow/ToggleRow.css';

const EMPTY_FORM = { to: '', fee: '' };

function parseDecimal(raw) {
    const text = String(raw ?? '').trim().replace(/\s/g, '').replace(',', '.');

    if (!/^\d+(\.\d*)?$/.test(text)) {
        return NaN;
    }

    return Number(text);
}

function round2(value) {
    return Math.round(value * 100) / 100;
}

function formatKm(value) {
    return String(Number(value)).replace('.', ',');
}

function sameRadius(a, b) {
    return Number(a).toFixed(2) === Number(b).toFixed(2);
}

function previousKm(zones, typedRadius, editingId) {
    const others = zones.filter((zone) => zone.id !== editingId);

    if (!Number.isFinite(typedRadius)) {
        return others.length > 0 ? others[others.length - 1].radius_km : 0;
    }

    let previous = 0;

    others.forEach((zone) => {
        if (zone.radius_km < typedRadius && zone.radius_km > previous) {
            previous = zone.radius_km;
        }
    });

    return previous;
}

function validateZone(radiusKm, feeAmount, zones, editingId) {
    if (!Number.isFinite(radiusKm) || radiusKm <= 0) {
        return 'Informe um valor maior que zero no campo "Até (km)".';
    }

    if (!Number.isFinite(feeAmount) || feeAmount < 0) {
        return 'Informe uma taxa maior ou igual a zero.';
    }

    const duplicate = zones.some((zone) => zone.id !== editingId && sameRadius(zone.radius_km, radiusKm));

    if (duplicate) {
        return 'Já existe uma faixa com este mesmo "até".';
    }

    return null;
}

export default function TaxasDeEntrega() {
    const [zones, setZones] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [formError, setFormError] = useState(null);
    const [actionError, setActionError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const cancelledRef = useRef(false);

    const loadZones = useCallback(async ({ silent = false } = {}) => {
        if (!silent) {
            setIsLoading(true);
        }

        setLoadError(null);

        try {
            const data = await apiFetch('/delivery-zones');

            if (cancelledRef.current) {
                return;
            }

            const list = Array.isArray(data) ? data : [];

            setZones(
                list
                    .map((zone) => ({
                        id: zone.id,
                        radius_km: Number(zone.radius_km),
                        fee_amount: Number(zone.fee_amount),
                    }))
                    .sort((a, b) => a.radius_km - b.radius_km)
            );
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
        loadZones();

        return () => {
            cancelledRef.current = true;
        };
    }, [loadZones]);

    const updateForm = (field) => (value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        setFormError(null);
    };

    const resetForm = () => {
        setEditingId(null);
        setForm(EMPTY_FORM);
        setFormError(null);
    };

    const handleSave = async () => {
        if (isSaving || isDeleting) {
            return;
        }

        const radiusKm = round2(parseDecimal(form.to));
        const feeAmount = round2(parseDecimal(form.fee));
        const validationError = validateZone(radiusKm, feeAmount, zones, editingId);

        if (validationError) {
            setFormError(validationError);
            return;
        }

        setFormError(null);
        setActionError(null);
        setIsSaving(true);

        try {
            const payload = { radius_km: radiusKm, fee_amount: feeAmount };

            if (editingId == null) {
                await apiFetch('/delivery-zones', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });
            } else {
                await apiFetch(`/delivery-zones/${editingId}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload),
                });
            }

            if (cancelledRef.current) {
                return;
            }

            resetForm();
            await loadZones({ silent: true });
        } catch (err) {
            if (!cancelledRef.current) {
                setFormError(translateApiError(err));
            }
        } finally {
            if (!cancelledRef.current) {
                setIsSaving(false);
            }
        }
    };

    const handleEdit = (zone) => {
        setEditingId(zone.id);
        setForm({
            to: formatKm(zone.radius_km),
            fee: Number(zone.fee_amount).toFixed(2).replace('.', ','),
        });
        setFormError(null);
        setActionError(null);
    };

    const handleDelete = async (zone) => {
        if (isSaving || isDeleting) {
            return;
        }

        const confirmed = window.confirm(`Excluir a faixa até ${formatKm(zone.radius_km)} km?`);

        if (!confirmed) {
            return;
        }

        setActionError(null);
        setIsDeleting(true);

        try {
            await apiFetch(`/delivery-zones/${zone.id}`, { method: 'DELETE' });

            if (cancelledRef.current) {
                return;
            }

            if (editingId === zone.id) {
                resetForm();
            }

            await loadZones({ silent: true });
        } catch (err) {
            if (!cancelledRef.current) {
                setActionError(translateApiError(err));
            }
        } finally {
            if (!cancelledRef.current) {
                setIsDeleting(false);
            }
        }
    };

    const typedRadius = parseDecimal(form.to);
    const fromKm = previousKm(zones, round2(typedRadius), editingId);
    const saveDisabled = isSaving || isDeleting || isLoading || Boolean(loadError);

    return (
            <div className="taxasDeEntregaApp">
                <AdminPageHeader
                    title="Taxas de Entrega"
                    subtitle="Defina valores por faixa de distância."
                />

                <div className="taxasDeEntregaGrid">
                    <AdminCard>
                        <SectionLabel>
                            {editingId == null ? 'Cadastrar nova distância' : 'Editar distância'}
                        </SectionLabel>

                        <div className="taxasForm">
                            <div className="taxasFormRow">
                                <FormField
                                    label="De (km)"
                                    value={formatKm(fromKm)}
                                    onChange={() => {}}
                                    disabled
                                />
                                <FormField
                                    label="Até (km)"
                                    type="text"
                                    value={form.to}
                                    onChange={updateForm('to')}
                                />
                            </div>

                            <div className="taxasFormRow">
                                <FormField
                                    label="Taxa (R$)"
                                    type="text"
                                    value={form.fee}
                                    onChange={updateForm('fee')}
                                />
                                <FormField
                                    label="Repasse motoboy (R$)"
                                    value=""
                                    onChange={() => {}}
                                    disabled
                                    hint="em breve"
                                />
                            </div>

                            {formError && (
                                <NormalText fontSize="1.2rem" color="var(--main-red)">{formError}</NormalText>
                            )}

                            <div className="taxasFormRow">
                                <Button
                                    variant="solid-success"
                                    icon={editingId == null ? <Plus size={16} /> : null}
                                    onClick={handleSave}
                                    disabled={saveDisabled}
                                >
                                    {editingId == null ? 'Salvar distância' : 'Atualizar faixa'}
                                </Button>

                                {editingId != null && (
                                    <Button
                                        variant="outline-neutral"
                                        onClick={resetForm}
                                        disabled={isSaving || isDeleting}
                                    >
                                        Cancelar
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="toggleRow">
                            <div className="toggleRowInfo">
                                <Title fontSize="1.4rem" fontWeight="600">Descontos em taxas</Title>
                                <NormalText fontSize="1.3rem">em breve</NormalText>
                            </div>

                            <div className="toggleRowActions">
                                <Toggle checked={false} disabled />
                            </div>
                        </div>
                    </AdminCard>

                    <AdminCard>
                        <SectionLabel>Distâncias cadastradas</SectionLabel>

                        <div className="taxasListHeader">
                            <NormalText fontSize="1.1rem" fontWeight="700" className="taxasListHeaderCell">Faixa</NormalText>
                            <NormalText fontSize="1.1rem" fontWeight="700" className="taxasListHeaderCell">Taxa</NormalText>
                            <NormalText fontSize="1.1rem" fontWeight="700" className="taxasListHeaderCell">Repasse motoboy</NormalText>
                            <NormalText fontSize="1.1rem" fontWeight="700" className="taxasListHeaderActions">Ações</NormalText>
                        </div>

                        {isLoading && (
                            <div className="taxasListHeader">
                                <NormalText fontSize="1.3rem">Carregando taxas...</NormalText>
                            </div>
                        )}

                        {!isLoading && loadError && (
                            <div className="taxasForm">
                                <NormalText fontSize="1.3rem" color="var(--main-red)">{loadError}</NormalText>
                                <Button variant="outline-success" onClick={() => loadZones()}>
                                    Tentar de novo
                                </Button>
                            </div>
                        )}

                        {!isLoading && !loadError && zones.length === 0 && (
                            <div className="taxasListHeader">
                                <NormalText fontSize="1.3rem">Nenhuma faixa cadastrada.</NormalText>
                            </div>
                        )}

                        {!isLoading && !loadError && actionError && (
                            <div className="taxasListHeader">
                                <NormalText fontSize="1.3rem" color="var(--main-red)">{actionError}</NormalText>
                            </div>
                        )}

                        {!isLoading && zones.map((zone, index) => {
                            const from = index === 0 ? 0 : zones[index - 1].radius_km;

                            return (
                                <DataListRow
                                    key={zone.id}
                                    columns={[
                                        `${formatKm(from)} km até ${formatKm(zone.radius_km)} km`,
                                        formatPrice(zone.fee_amount),
                                        '—',
                                    ]}
                                    onEdit={() => handleEdit(zone)}
                                    onDelete={() => handleDelete(zone)}
                                />
                            );
                        })}
                    </AdminCard>
                </div>
            </div>
    );
}
