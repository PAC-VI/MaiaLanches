import './InfoModal.css';

import Modal from '../Modal/Modal';
import ModalHeader from '../ModalHeader/ModalHeader';

import { Title, NormalText } from '../../../styles/globalStyles';

function infoText(value) {
    const text = String(value ?? '').trim();

    return text || '—';
}

export default function InfoModal({ isOpen, onClose, storeSettings = null }) {
    const deliveryLine = storeSettings
        ? `${storeSettings.delivery_time_minutes} min · Retirada em ${storeSettings.pickup_time_minutes} min`
        : 'Tempos indisponíveis no momento.';

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalHeader title="Informações" onClose={onClose} />

            <NormalText fontSize="1.4rem" color="var(--black)" className="infoDescription">
                {infoText(storeSettings?.description)}
            </NormalText>

            <div className="infoBlock">
                <Title fontSize="1.4rem" fontWeight="600">Endereço</Title>
                <NormalText fontSize="1.4rem" color="var(--black)">{infoText(storeSettings?.address)}</NormalText>
            </div>

            <div className="infoBlock">
                <Title fontSize="1.4rem" fontWeight="600">Entrega</Title>
                <NormalText fontSize="1.4rem" color="var(--black)">{deliveryLine}</NormalText>
            </div>

            <div className="infoBlock">
                <Title fontSize="1.4rem" fontWeight="600">Contato</Title>
                <NormalText fontSize="1.4rem" color="var(--black)">{infoText(storeSettings?.contact)}</NormalText>
            </div>
        </Modal>
    );
}
