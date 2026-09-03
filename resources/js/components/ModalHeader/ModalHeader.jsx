import './ModalHeader.css';

import { X } from 'lucide-react';
import { Title } from '../../../styles/globalStyles';

export default function ModalHeader({ title, onClose }) {
    return (
        <div className="modalHeader">
            <Title fontSize="1.8rem">{title}</Title>

            <button className="modalCloseButton" onClick={onClose}>
                <X size={18} color="var(--main-red)" />
            </button>
        </div>
    );
}