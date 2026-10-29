import './PaymentMethodsModal.css';

import { useEffect, useState } from 'react';

import Modal from '../Modal/Modal';
import ModalHeader from '../ModalHeader/ModalHeader';

import { NormalText } from '../../../styles/globalStyles';
import { publicApiFetch } from '../../lib/publicApi';
import { translateApiError } from '../../lib/apiErrors';

function unwrapMethods(payload) {
    const list = Array.isArray(payload) ? payload : (payload?.data ?? []);

    return list.filter((method) => method?.code && method?.label);
}

export default function PaymentMethodsModal({ isOpen, onClose }) {
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [loadError, setLoadError] = useState(null);

    useEffect(() => {
        if (!isOpen) {
            setPaymentMethods([]);
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
                const data = await publicApiFetch('/payment-methods');

                if (cancelled) {
                    return;
                }

                setPaymentMethods(unwrapMethods(data));
                setLoadError(null);
                setHasLoaded(true);
            } catch (err) {
                if (!cancelled && !silent) {
                    setPaymentMethods([]);
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
            <ModalHeader title="Formas de pagamento" onClose={onClose} />

            <div className="paymentMethodsList">
                {(isLoading || !hasLoaded) && !loadError && (
                    <NormalText fontSize="1.4rem" color="var(--black)">
                        Carregando formas de pagamento...
                    </NormalText>
                )}

                {!isLoading && loadError && (
                    <NormalText fontSize="1.4rem" color="var(--main-red)">
                        {loadError}
                    </NormalText>
                )}

                {hasLoaded && !isLoading && !loadError && paymentMethods.length === 0 && (
                    <NormalText fontSize="1.4rem" color="var(--black)">
                        Nenhuma forma de pagamento disponível no momento.
                    </NormalText>
                )}

                {hasLoaded && !isLoading && !loadError && paymentMethods.map((method) => (
                    <div key={method.code} className="paymentMethodItem">
                        <NormalText fontSize="1.4rem" color="var(--black)">
                            {method.label}
                        </NormalText>
                    </div>
                ))}
            </div>
        </Modal>
    );
}
