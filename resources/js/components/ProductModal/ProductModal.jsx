import './ProductModal.css';

import Modal from '../Modal/Modal';

import { useState } from 'react';
import { X, Minus, Plus } from 'lucide-react';
import { Title, NormalText } from '../../../styles/globalStyles';

export default function ProductModal({ isOpen, onClose, product, onConfirm }) {
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState('');

    if (!product) return null;

    const handleDecrease = () => setQuantity((q) => Math.max(1, q - 1));
    const handleIncrease = () => setQuantity((q) => q + 1);

    const totalPrice = product.price * quantity;

    const handleConfirm = () => {
        onConfirm?.({ product, quantity, notes });
        onClose?.();
        setQuantity(1);
        setNotes('');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className="productModalHeader">
                <Title fontSize="1.8rem">{product.name}</Title>

                <button className="closeButton" onClick={onClose}>
                    <X size={20} color="var(--gray)" />
                </button>
            </div>

            <NormalText fontSize="1.3rem">{product.description}</NormalText>

            <div className="productModalNotes">
                <Title fontSize="1.3rem" fontWeight="600">Observações</Title>

                <textarea
                    placeholder="Ex: sem cebola, ponto da carne, molho à parte..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                />
            </div>

            <div className="productModalFooter">
                <div className="quantityControl">
                    <button onClick={handleDecrease} disabled={quantity === 1}>
                        <Minus size={16} color="var(--black)" />
                    </button>

                    <Title fontSize="1.4rem">{quantity}</Title>

                    <button onClick={handleIncrease}>
                        <Plus size={16} color="var(--black)" />
                    </button>
                </div>

                <button className="confirmButton" onClick={handleConfirm}>
                    Adicionar · R$ {totalPrice.toFixed(2).replace('.', ',')}
                </button>
            </div>
        </Modal>
    );
}