import './ProductModal.css';

import Modal from '../Modal/Modal';

import { useEffect, useState } from 'react';
import { X, Minus, Plus } from 'lucide-react';
import { Title, NormalText } from '../../../styles/globalStyles';
import { formatPrice } from '../../lib/format';
import { filterNote } from '../../lib/textInput';
import { useDirtyForm } from '../../lib/useDirtyForm';

export default function ProductModal({ isOpen, onClose, product, addOns = [], onConfirm }) {
    const sizes = product?.sizes ?? [];

    const [selectedSizeId, setSelectedSizeId] = useState(sizes[0]?.id ?? null);
    const [addOnQuantities, setAddOnQuantities] = useState({});
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState('');
    const [limitMessage, setLimitMessage] = useState('');
    const isDirty = useDirtyForm({
        selectedSizeId,
        addOnQuantities,
        quantity,
        notes,
    });

    // Sempre que o modal abre para um produto novo, reseta a seleção para
    // o primeiro tamanho (evita manter o tamanho de um produto anterior).
    useEffect(() => {
        if (isOpen) {
            setSelectedSizeId(sizes[0]?.id ?? null);
            setAddOnQuantities({});
            setQuantity(1);
            setNotes('');
            setLimitMessage('');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, product?.id]);

    if (!product) return null;

    const categoryId = Number(product.category_id);
    const availableAddOns = addOns.filter((addOn) => (
        Array.isArray(addOn.category_ids)
        && addOn.category_ids.some((id) => Number(id) === categoryId)
    ));
    const selectedSize = sizes.find((size) => size.id === selectedSizeId) ?? sizes[0];
    const selectedAddOns = availableAddOns
        .map((addOn) => ({
            id: addOn.id,
            name: addOn.name,
            price: Number(addOn.price),
            quantity: addOnQuantities[addOn.id] ?? 0,
        }))
        .filter((addOn) => addOn.quantity > 0);
    const selectedAddOnCount = selectedAddOns.length;

    const handleDecrease = () => setQuantity((q) => Math.max(1, q - 1));
    const handleIncrease = () => setQuantity((q) => Math.min(50, q + 1));

    const changeAddOnQuantity = (addOnId, delta) => {
        setAddOnQuantities((current) => {
            const nextQuantity = (current[addOnId] ?? 0) + delta;

            if (nextQuantity <= 0) {
                const next = { ...current };
                delete next[addOnId];
                return next;
            }

            if (nextQuantity > 10) {
                return current;
            }

            if ((current[addOnId] ?? 0) === 0 && Object.keys(current).length >= 10) {
                return current;
            }

            return { ...current, [addOnId]: nextQuantity };
        });
    };

    const unitCents = Math.round(Number(selectedSize?.price ?? 0) * 100)
        + selectedAddOns.reduce((sum, addOn) => sum + Math.round(addOn.price * 100) * addOn.quantity, 0);
    const unitPrice = unitCents / 100;
    const totalPrice = unitPrice * quantity;

    const handleConfirm = () => {
        if (!selectedSize) return;

        const result = onConfirm?.({
            productId: product.id,
            productName: product.name,
            sizeId: selectedSize.id,
            sizeName: selectedSize.size_name,
            unitBasePrice: selectedSize.price,
            addOns: selectedAddOns.map((addOn) => ({
                id: addOn.id,
                name: addOn.name,
                price: addOn.price,
                quantity: addOn.quantity,
            })),
            unitPrice,
            quantity,
            observation: notes.trim(),
        });

        if (result?.ok === false) {
            setLimitMessage(result.reason || '');
            return;
        }

        onClose?.();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} blockDismiss={isDirty}>
            <div className="productModalHeader">
                <Title fontSize="1.8rem">{product.name}</Title>

                <button className="closeButton" onClick={onClose}>
                    <X size={20} color="var(--gray)" />
                </button>
            </div>

            <NormalText className="productModalDescription" fontSize="1.3rem">{product.description}</NormalText>

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

            {availableAddOns.length > 0 && (
                <div className="productModalOptions">
                    <Title fontSize="1.3rem" fontWeight="600">Acréscimos</Title>

                    <div className="optionList">
                        {availableAddOns.map((addOn) => {
                            const addOnQuantity = addOnQuantities[addOn.id] ?? 0;
                            const cannotAddAnother = addOnQuantity === 0 && selectedAddOnCount >= 10;

                            return (
                                <div key={addOn.id} className="optionRow addOnRow">
                                    <NormalText fontSize="1.3rem" color="var(--black)">{addOn.name}</NormalText>
                                    <span className="addOnRowRight">
                                        <NormalText fontSize="1.3rem">+ {formatPrice(addOn.price)}</NormalText>
                                        <div className="addOnStepper">
                                            <button
                                                type="button"
                                                aria-label={`Diminuir ${addOn.name}`}
                                                onClick={() => changeAddOnQuantity(addOn.id, -1)}
                                                disabled={addOnQuantity === 0}
                                            >
                                                <Minus size={14} color="var(--black)" />
                                            </button>
                                            <Title fontSize="1.3rem">{addOnQuantity}</Title>
                                            <button
                                                type="button"
                                                aria-label={`Aumentar ${addOn.name}`}
                                                onClick={() => changeAddOnQuantity(addOn.id, 1)}
                                                disabled={addOnQuantity >= 10 || cannotAddAnother}
                                            >
                                                <Plus size={14} color="var(--black)" />
                                            </button>
                                        </div>
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="productModalNotes">
                <Title fontSize="1.3rem" fontWeight="600">Observações</Title>

                <textarea
                    placeholder="Ex: sem cebola, ponto da carne, molho à parte..."
                    value={notes}
                    maxLength={180}
                    onChange={(e) => setNotes(filterNote(e.target.value))}
                    rows={3}
                />
            </div>

            {limitMessage ? (
                <NormalText className="productModalLimit" fontSize="1.3rem" color="var(--main-red)">
                    {limitMessage}
                </NormalText>
            ) : null}

            <div className="productModalFooter">
                <div className="quantityControl">
                    <button onClick={handleDecrease} disabled={quantity === 1}>
                        <Minus size={16} color="var(--black)" />
                    </button>

                    <Title fontSize="1.4rem">{quantity}</Title>

                    <button onClick={handleIncrease} disabled={quantity >= 50}>
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
