import './OpeningHoursModal.css';

import Modal from '../Modal/Modal';
import ModalHeader from '../ModalHeader/ModalHeader';

import { NormalText } from '../../../styles/globalStyles';
import { openingHours } from '../../mocks/establishmentMock';

export default function OpeningHoursModal({ isOpen, onClose }) {
    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalHeader title="Horários de funcionamento" onClose={onClose} />

            <NormalText fontSize="1.2rem" color="var(--gray)" className="openingHoursNotice">
                Dados de demonstração
            </NormalText>

            <div className="openingHoursList">
                {openingHours.map(({ day, hours }) => (
                    <div key={day} className="openingHoursItem">
                        <NormalText fontSize="1.4rem" color="var(--black)">
                            {day}
                        </NormalText>

                        <NormalText fontSize="1.4rem" color={hours === 'Fechado' ? 'var(--gray)' : 'var(--black)'}>
                            {hours}
                        </NormalText>
                    </div>
                ))}
            </div>
        </Modal>
    );
}