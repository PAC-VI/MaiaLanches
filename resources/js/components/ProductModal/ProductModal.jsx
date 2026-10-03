import './ProductModal.css';

import Modal from '../Modal/Modal';

import { useEffect, useState } from 'react';
import { X, Minus, Plus } from 'lucide-react';
import { Title, NormalText } from '../../../styles/globalStyles';

function formatPrice(value) {
    return `R$ ${Number(value).toFixed(2).replace('.', ',')}`;
}

export default function ProductModal({ isOpen, onClose, product, addOns = [], onConfirm }) {
    const sizes = product?.sizes ?? [];

    const [selectedSizeId, setSelectedSizeId] = useState(sizes[0]?.id ?? null);
    const [selectedAddOnIds, setSelectedAddOnIds] = useState([]);
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState('');

    // Sempre que o modal abre para um produto novo, reseta a seleção para
    // o primeiro tamanho (evita manter o tamanho de um produto anterior).
    useEffect(() => {
        if (isOpen) {
            setSelectedSizeId(sizes[0]?.id ?? null);
            setSelectedAddOnIds([]);
            setQuantity(1);
            setNotes('');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, product?.id]);

    if (!product) return null;

    const selectedSize = sizes.find((size) => size.id === selectedSizeId) ?? sizes[0];
    const selectedAddOns = addOns.filter((addOn) => selectedAddOnIds.includes(addOn.id));

    const handleDecrease = () => setQuantity((q) => Math.max(1, q - 1));
    const handleIncrease = () => setQuantity((q) => q + 1);

    const toggleAddOn = (addOnId) => {
        setSelectedAddOnIds((current) => (
            current.includes(addOnId)
                ? current.filter((id) => id !== addOnId)
                : [...current, addOnId]
        ));
    };

    const unitPrice = (selectedSize?.price ?? 0)
        + selectedAddOns.reduce((sum, addOn) => sum + Number(addOn.price), 0);
    const totalPrice = unitPrice * quantity;

    const handleConfirm = () => {
        if (!selectedSize) return;

        onConfirm?.({
            productId: product.id,
            productName: product.name,
            sizeId: selectedSize.id,
            sizeName: selectedSize.size_name,
            unitBasePrice: selectedSize.price,
            addOns: selectedAddOns.map((addOn) => ({ id: addOn.id, name: addOn.name, price: addOn.price })),
            unitPrice,
            quantity,
            observation: notes.trim(),
        });

        onClose?.();
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

            {sizes.length > 1 && (
                <div className="productModalOptions">
                    <Title fontSize="1.3rem" fontWeight="600">Tamanho</Title>

                    <div className="optionList">
                        {sizes.map((size) => (
                            <label key={size.id} className="optionRow">
                                <span className="optionRowLeft">
                                    <input
                                        type="radio"
                                        name="productSize"
                                        checked={selectedSizeId === size.id}
                                        onChange={() => setSelectedSizeId(size.id)}
                                    />
                                    <NormalText fontSize="1.3rem">{size.size_name}</NormalText>
                                </span>
                                <NormalText fontSize="1.3rem">{formatPrice(size.price)}</NormalText>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {addOns.length > 0 && (
                <div className="productModalOptions">
                    <Title fontSize="1.3rem" fontWeight="600">Acréscimos</Title>

                    <div className="optionList">
                        {addOns.map((addOn) => (
                            <label key={addOn.id} className="optionRow">
                                <span className="optionRowLeft">
                                    <input
                                        type="checkbox"
                                        checked={selectedAddOnIds.includes(addOn.id)}
                                        onChange={() => toggleAddOn(addOn.id)}
                                    />
                                    <NormalText fontSize="1.3rem">{addOn.name}</NormalText>
                                </span>
                                <NormalText fontSize="1.3rem">+ {formatPrice(addOn.price)}</NormalText>
                            </label>
                        ))}
                    </div>
                </div>
            )}

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

                <button className="confirmButton" onClick={handleConfirm} disabled={!selectedSize}>
                    Adicionar · {formatPrice(totalPrice)}
                </button>
            </div>
        </Modal>
    );
}
