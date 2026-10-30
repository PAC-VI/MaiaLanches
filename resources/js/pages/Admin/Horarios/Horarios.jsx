import './Horarios.css';

import { useCallback, useEffect, useRef, useState } from 'react';

import AdminPageHeader from '../../../components/AdminPageHeader/AdminPageHeader';
import AdminCard from '../../../components/AdminCard/AdminCard';
import SectionLabel from '../../../components/SectionLabel/SectionLabel';
import FormField from '../../../components/FormField/FormField';
import Toggle from '../../../components/Toggle/Toggle';
import Button from '../../../components/Button/Button';
import { Title, NormalText } from '../../../../styles/globalStyles';

import { apiFetch } from '../../../lib/adminApi';
import { translateApiError } from '../../../lib/apiErrors';
import { crossesMidnight, sortStoreHours, weekdayLabel } from '../../../lib/format';

function normalizeDays(payload) {
    const list = Array.isArray(payload?.days) ? payload.days : null;

    if (!list || list.length !== 7) {
        return null;
    }

    return sortStoreHours(list.map((day) => ({
        id: day.id,
        weekday: Number(day.weekday),
        is_open_day: Boolean(day.is_open_day),
        opens_at: day.opens_at ? String(day.opens_at).slice(0, 5) : '',
        closes_at: day.closes_at ? String(day.closes_at).slice(0, 5) : '',
    })));
}

function clientError(days) {
    for (const day of days) {
        if (!day.is_open_day) {
            continue;
        }

        const label = weekdayLabel(day.weekday);

        if (!day.opens_at || !day.closes_at) {
            return `${label} aberto precisa de abertura e fechamento.`;
        }

        if (day.opens_at === day.closes_at) {
            return `Abertura e fechamento de ${label} precisam ser diferentes.`;
        }
    }

    return null;
}

export default function Horarios() {
    const [days, setDays] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const [savedMessage, setSavedMessage] = useState(null);
    const cancelledRef = useRef(false);

    const loadHours = useCallback(async () => {
        setIsLoading(true);
        setLoadError(null);

        try {
            const data = await apiFetch('/admin/store-hours');

            if (cancelledRef.current) {
                return;
            }

            const normalized = normalizeDays(data);

            if (!normalized) {
                setDays([]);
                setLoadError('Não foi possível carregar os horários da semana.');
                return;
            }

            setDays(normalized);
        } catch (err) {
            if (!cancelledRef.current) {
                setDays([]);
                setLoadError(translateApiError(err));
            }
        } finally {
            if (!cancelledRef.current) {
                setIsLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        cancelledRef.current = false;
        loadHours();

        return () => {
            cancelledRef.current = true;
        };
    }, [loadHours]);

    const updateDay = (weekday, patch) => {
        setSaveError(null);
        setSavedMessage(null);
        setDays((prev) => prev.map((day) => (
            day.weekday === weekday ? { ...day, ...patch } : day
        )));
    };

    const handleSave = async () => {
        if (isSaving || isLoading || loadError) {
            return;
        }

        const error = clientError(days);

        if (error) {
            setSaveError(error);
            setSavedMessage(null);
            return;
        }

        setIsSaving(true);
        setSaveError(null);
        setSavedMessage(null);

        try {
            const data = await apiFetch('/admin/store-hours', {
                method: 'PUT',
                body: JSON.stringify({
                    days: days.map((day) => ({
                        weekday: day.weekday,
                        is_open_day: day.is_open_day,
                        opens_at: day.opens_at || null,
                        closes_at: day.closes_at || null,
                    })),
                }),
            });

            if (cancelledRef.current) {
                return;
            }

            const normalized = normalizeDays(data);

            if (!normalized) {
                setSaveError('Não foi possível carregar os horários da semana.');
                return;
            }

            setDays(normalized);
            setSavedMessage('Horários salvos.');
        } catch (err) {
            if (!cancelledRef.current) {
                setSaveError(translateApiError(err));
            }
        } finally {
            if (!cancelledRef.current) {
                setIsSaving(false);
            }
        }
    };

    return (
        <div className="padroesDeHorarioApp">
            <AdminPageHeader
                title="Padrões de Horário"
                subtitle="Horário exibido para o cliente. Abrir ou fechar a loja continua no botão do painel."
            >
                <Button onClick={handleSave} disabled={isLoading || isSaving || Boolean(loadError)}>
                    {isSaving ? 'Salvando...' : 'Salvar horários'}
                </Button>
            </AdminPageHeader>

            <AdminCard>
                <SectionLabel>Dias da semana</SectionLabel>

                {isLoading && (
                    <div className="scheduleHoursState">
                        <NormalText fontSize="1.3rem">Carregando horários...</NormalText>
                    </div>
                )}

                {!isLoading && loadError && (
                    <div className="scheduleHoursState">
                        <NormalText fontSize="1.3rem" color="var(--main-red)">{loadError}</NormalText>
                        <div className="scheduleHoursActions">
                            <Button variant="outline-success" onClick={loadHours}>
                                Tentar de novo
                            </Button>
                        </div>
                    </div>
                )}

                {!isLoading && !loadError && saveError && (
                    <div className="scheduleHoursState">
                        <NormalText fontSize="1.3rem" color="var(--main-red)">{saveError}</NormalText>
                    </div>
                )}

                {!isLoading && !loadError && savedMessage && (
                    <div className="scheduleHoursState">
                        <NormalText fontSize="1.3rem" color="var(--warning-green)">{savedMessage}</NormalText>
                    </div>
                )}

                {!isLoading && !loadError && days.map((day) => (
                    <div key={day.weekday} className="scheduleDayRow">
                        <div className="scheduleDayIdentity">
                            <Title fontSize="1.4rem" fontWeight="600">{weekdayLabel(day.weekday)}</Title>
                            <div className="scheduleDayOpen">
                                <Toggle
                                    checked={day.is_open_day}
                                    disabled={isSaving}
                                    onChange={(checked) => updateDay(day.weekday, { is_open_day: checked })}
                                />
                                <NormalText fontSize="1.3rem" color="var(--black)">
                                    {day.is_open_day ? 'Aberto' : 'Fechado'}
                                </NormalText>
                            </div>
                        </div>

                        <FormField
                            label="Abre"
                            type="time"
                            value={day.opens_at}
                            disabled={!day.is_open_day || isSaving}
                            onChange={(value) => updateDay(day.weekday, { opens_at: String(value).slice(0, 5) })}
                        />

                        <FormField
                            label="Fecha"
                            type="time"
                            value={day.closes_at}
                            disabled={!day.is_open_day || isSaving}
                            hint={day.is_open_day && crossesMidnight(day.opens_at, day.closes_at) ? 'Vira o dia' : undefined}
                            onChange={(value) => updateDay(day.weekday, { closes_at: String(value).slice(0, 5) })}
                        />
                    </div>
                ))}

                {!isLoading && !loadError && (
                    <NormalText fontSize="1.2rem" className="scheduleHoursHint">
                        Se o fechamento for menor que a abertura, o expediente vira o dia. Ex.: 18:00 até 00:00.
                    </NormalText>
                )}
            </AdminCard>
        </div>
    );
}
