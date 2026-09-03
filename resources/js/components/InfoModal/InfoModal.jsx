import './InfoModal.css';

import Modal from '../Modal/Modal';
import ModalHeader from '../ModalHeader/ModalHeader';

import { Title, NormalText } from '../../../styles/globalStyles';
import { establishmentInfo } from '../../mocks/establishmentMock';

export default function InfoModal({ isOpen, onClose }) {
    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalHeader title="Informações" onClose={onClose} />

            <NormalText fontSize="1.4rem" color="var(--black)" className="infoDescription">
                {establishmentInfo.description}
            </NormalText>

            <div className="infoBlock">
                <Title fontSize="1.4rem" fontWeight="600">Endereço</Title>
                <NormalText fontSize="1.4rem" color="var(--black)">{establishmentInfo.address}</NormalText>
            </div>

            <div className="infoBlock">
                <Title fontSize="1.4rem" fontWeight="600">Entrega</Title>
                <NormalText fontSize="1.4rem" color="var(--black)">{establishmentInfo.delivery}</NormalText>
            </div>

            <div className="infoBlock">
                <Title fontSize="1.4rem" fontWeight="600">Contato</Title>
                <NormalText fontSize="1.4rem" color="var(--black)">{establishmentInfo.contact}</NormalText>
            </div>
        </Modal>
    );
}