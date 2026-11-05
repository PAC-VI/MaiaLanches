import { useState, useEffect, useRef } from 'react';
import './AdminHeader.css';

import { User } from 'lucide-react';
import { NormalText } from '../../../styles/globalStyles';
import { apiFetch } from '../../lib/adminApi';
import { getFieldErrors, translateApiError } from '../../lib/apiErrors';

// Sobrevive a um remonte do header entre páginas, até o layout persistente segurar o estado.
let cachedStoreOpen = null;

export default function AdminHeader() {
    const [userName, setUserName] = useState('');
    const [isStoreOpen, setIsStoreOpen] = useState(cachedStoreOpen);
    const [deliveryTime, setDeliveryTime] = useState(0);
    const [pickupTime, setPickupTime] = useState(0);
    const [togglingStore, setTogglingStore] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [statusError, setStatusError] = useState('');
    const [deliveryError, setDeliveryError] = useState('');
    const [pickupError, setPickupError] = useState('');

    const savedDelivery = useRef(null);
    const savedPickup = useRef(null);

    useEffect(() => {
        let cancelled = false;

        async function loadHeader() {
            try {
                const [me, settings] = await Promise.all([
                    apiFetch('/admin/me'),
                    apiFetch('/store-settings'),
                ]);

                if (cancelled) return;

                const user = me?.user;
                setUserName(user?.name ?? '');
                cachedStoreOpen = Boolean(settings.is_open);
                setIsStoreOpen(cachedStoreOpen);

                const delivery = Number(settings.delivery_time_minutes) || 0;
                const pickup = Number(settings.pickup_time_minutes) || 0;
                setDeliveryTime(delivery);
                setPickupTime(pickup);
                savedDelivery.current = delivery;
                savedPickup.current = pickup;
            } catch (_) {
                // 401 redireciona em apiFetch
            }
        }

        loadHeader();

        return () => {
            cancelled = true;
        };
    }, []);

    async function handleToggleStore() {
        if (togglingStore || isStoreOpen === null) return;

        const previous = isStoreOpen;
        const next = !previous;
        cachedStoreOpen = next;
        setIsStoreOpen(next);
        setTogglingStore(true);
        setStatusError('');

        try {
            const data = await apiFetch('/store-settings', {
                method: 'PUT',
                body: JSON.stringify({ is_open: next }),
            });
            cachedStoreOpen = Boolean(data.is_open);
            setIsStoreOpen(cachedStoreOpen);
        } catch (_) {
            cachedStoreOpen = previous;
            setIsStoreOpen(previous);
            setStatusError('Não foi possível alterar o status da loja');
        } finally {
            setTogglingStore(false);
        }
    }

    async function saveMinutes(field, value) {
        const savedRef = field === 'delivery_time_minutes' ? savedDelivery : savedPickup;
        const setter = field === 'delivery_time_minutes' ? setDeliveryTime : setPickupTime;
        const setFieldError = field === 'delivery_time_minutes' ? setDeliveryError : setPickupError;

        if (value === '' || value === null) {
            setter(0);
            value = 0;
        }

        const text = String(value).trim();

        if (!/^\d+$/.test(text) || Number(text) > 600) {
            setFieldError('Informe minutos inteiros de 0 a 600.');
            return;
        }

        const minutes = Number(text);
        setter(minutes);
        setFieldError('');

        if (savedRef.current === minutes) {
            return;
        }

        setStatusError('');
        setStatusMessage('salvando…');

        try {
            const data = await apiFetch('/store-settings', {
                method: 'PUT',
                body: JSON.stringify({ [field]: minutes }),
            });
            const confirmed = Number(data[field]);
            setter(confirmed);
            savedRef.current = confirmed;
            setStatusMessage('');
        } catch (err) {
            setter(savedRef.current ?? 0);
            setStatusMessage('');
            const fields = getFieldErrors(err);
            setFieldError(fields[field] || translateApiError(err));
        }
    }

    return (
        <header className="adminHeader">
            <div className="adminHeaderStoreStatus">
                <button
                    type="button"
                    className={`storeToggleButton ${isStoreOpen === null ? 'pending' : isStoreOpen ? 'open' : 'closed'}`}
                    onClick={handleToggleStore}
                    disabled={isStoreOpen === null || togglingStore}
                >
                    {isStoreOpen === null ? '…' : isStoreOpen ? 'FECHAR LOJA' : 'ABRIR LOJA'}
                </button>

                <NormalText fontSize="1.3rem">
                    Status: {isStoreOpen === null ? '…' : isStoreOpen ? 'Loja aberta' : 'Loja fechada'}
                </NormalText>
            </div>

            <div className="adminHeaderInfo">
                <div className="adminHeaderField">
                    <NormalText fontSize="1.2rem">Entrega</NormalText>
                    <input
                        type="number"
                        min={0}
                        max={600}
                        step={1}
                        value={deliveryTime}
                        onChange={(e) => {
                            setDeliveryError('');
                            setDeliveryTime(e.target.value === '' ? '' : e.target.value);
                        }}
                        onBlur={() => saveMinutes('delivery_time_minutes', deliveryTime === '' ? 0 : deliveryTime)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') e.currentTarget.blur();
                        }}
                    />
                    <NormalText fontSize="1.2rem">min</NormalText>
                    {deliveryError ? (
                        <NormalText className="adminHeaderFieldError" fontSize="1.1rem" color="var(--main-red)">
                            {deliveryError}
                        </NormalText>
                    ) : null}
                </div>

                <div className="adminHeaderField">
                    <NormalText fontSize="1.2rem">Retirada</NormalText>
                    <input
                        type="number"
                        min={0}
                        max={600}
                        step={1}
                        value={pickupTime}
                        onChange={(e) => {
                            setPickupError('');
                            setPickupTime(e.target.value === '' ? '' : e.target.value);
                        }}
                        onBlur={() => saveMinutes('pickup_time_minutes', pickupTime === '' ? 0 : pickupTime)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') e.currentTarget.blur();
                        }}
                    />
                    <NormalText fontSize="1.2rem">min</NormalText>
                    {pickupError ? (
                        <NormalText className="adminHeaderFieldError" fontSize="1.1rem" color="var(--main-red)">
                            {pickupError}
                        </NormalText>
                    ) : null}
                </div>

                {(statusMessage || statusError) ? (
                    <NormalText
                        fontSize="1.1rem"
                        color={statusError ? 'var(--main-red)' : 'var(--gray)'}
                    >
                        {statusError || statusMessage}
                    </NormalText>
                ) : null}

                <div className="adminHeaderUser">
                    <div className="adminHeaderUserIcon">
                        <User size={16} color="var(--gray)" />
                    </div>
                    <NormalText fontSize="1.3rem" color="var(--black)">
                        {userName || '…'}
                    </NormalText>
                </div>
            </div>
        </header>
    );
}
