import './OpeningHoursModal.css';

import { useEffect, useState } from 'react';

import Modal from '../Modal/Modal';
import ModalHeader from '../ModalHeader/ModalHeader';

import { NormalText } from '../../../styles/globalStyles';
import { publicApiFetch } from '../../lib/publicApi';
import { translateApiError } from '../../lib/apiErrors';
import { formatStoreHours, sortStoreHours, weekdayLabel } from '../../lib/format';

function normalizeHours(payload) {
    const list = Array.isArray(payload?.days) ? payload.days : null;

    if (!list || list.length !== 7) {
        return null;
    }

    const today = Number(payload.today);

    return {
        today: Number.isInteger(today) ? today : null,
        days: sortStoreHours(list),
    };
}

export default function OpeningHoursModal({ isOpen, onClose }) {
    const [days, setDays] = useState([]);
    const [today, setToday] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [loadError, setLoadError] = useState(null);

    useEffect(() => {
        if (!isOpen) {
            setDays([]);
            setToday(null);
            setIsLoading(false);
            setHasLoaded(false);
            setLoadError(null);
            return undefined;
        }

        let cancelled = false;

        const load = async (silent) => {
            if (!silent) {
                setIsLoading(true);
                setLoadError(null);
            }

            try {
                const data = await publicApiFetch('/store-hours');

                if (cancelled) {
                    return;
                }

                const normalized = normalizeHours(data);

                if (!normalized) {
                    if (!silent) {
                        setDays([]);
                        setToday(null);
                        setLoadError('Não foi possível carregar os horários.');
                        setHasLoaded(true);
                    }
                    return;
                }

                setDays(normalized.days);
                setToday(normalized.today);
                setLoadError(null);
                setHasLoaded(true);
            } catch (err) {
                if (!cancelled && !silent) {
                    setDays([]);
                    setToday(null);
                    setLoadError(translateApiError(err));
                    setHasLoaded(true);
                }
            } finally {
                if (!cancelled && !silent) {
                    setIsLoading(false);
                }
            }
        };

        load(false);

        const onVisible = () => {
            if (document.visibilityState === 'visible') {
                load(true);
            }
        };

        document.addEventListener('visibilitychange', onVisible);

        return () => {
            cancelled = true;
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalHeader title="Horários de funcionamento" onClose={onClose} />

            <div className="openingHoursList">
                {(isLoading || !hasLoaded) && !loadError && (
                    <NormalText fontSize="1.4rem" color="var(--black)">
                        Carregando horários...
                    </NormalText>
                )}

                {!isLoading && loadError && (
                    <NormalText fontSize="1.4rem" color="var(--main-red)">
                        {loadError}
                    </NormalText>
                )}

                {hasLoaded && !isLoading && !loadError && days.map((day) => {
                    const hours = formatStoreHours(day.is_open_day, day.opens_at, day.closes_at);
                    const isToday = today === Number(day.weekday);

                    return (
                        <div
                            key={day.weekday}
                            className={`openingHoursItem${isToday ? ' openingHoursItemToday' : ''}`}
                        >
                            <NormalText
                                fontSize="1.4rem"
                                fontWeight={isToday ? '700' : '400'}
                                color={isToday ? 'var(--main-red)' : 'var(--black)'}
                            >
                                {weekdayLabel(day.weekday)}{isToday ? ' · Hoje' : ''}
                            </NormalText>

                            <NormalText fontSize="1.4rem" color={hours === 'Fechado' ? 'var(--gray)' : 'var(--black)'}>
                                {hours}
                            </NormalText>
                        </div>
                    );
                })}
            </div>
        </Modal>
    );
}
