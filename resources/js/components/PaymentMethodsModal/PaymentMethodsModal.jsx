import './PaymentMethodsModal.css';

import Modal from '../Modal/Modal';
import ModalHeader from '../ModalHeader/ModalHeader';

import { NormalText } from '../../../styles/globalStyles';
import { paymentMethods } from '../../mocks/establishmentMock';

export default function PaymentMethodsModal({ isOpen, onClose }) {
    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalHeader title="Formas de pagamento" onClose={onClose} />

            <div className="paymentMethodsList">
                {paymentMethods.map((method) => (
                    <div key={method} className="paymentMethodItem">
                        <NormalText fontSize="1.4rem" color="var(--black)">
                            {method}
                        </NormalText>
                    </div>
                ))}
            </div>
        </Modal>
    );
}