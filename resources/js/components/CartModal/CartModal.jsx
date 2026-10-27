import './CartModal.css';

import Modal from '../Modal/Modal';
import ModalHeader from '../ModalHeader/ModalHeader';

import { useEffect, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Title, NormalText } from '../../../styles/globalStyles';
import { publicApiFetch } from '../../lib/publicApi';
import { saveOrder } from '../../lib/orderStorage';
import { translateApiError } from '../../lib/apiErrors';
import { formatPrice } from '../../lib/format';
import {
    filterAddress,
    filterNote,
    filterPersonName,
    hasUnsafeText,
    isPersonName,
    isPhoneNumber,
    maskPhone,
} from '../../lib/textInput';

const PAYMENT_LABELS = {
    dinheiro: 'Dinheiro',
    cartao: 'Cartão',
    pix: 'Pix',
};

const INITIAL_FORM = {
    customer_name: '',
    customer_phone: '',
    type: 'pickup',
    delivery_address: '',
    delivery_zone_id: '',
    payment_method: 'pix',
    change_for: '',
};

function cartItemTotal(item) {
    return Number(item.unitPrice) * item.quantity;
}

function messageFromApi(err) {
    const rawItems = err?.errors?.items;
    const itemsMessage = Array.isArray(rawItems)
        ? rawItems.find((item) => typeof item === 'string')
        : rawItems;

    if (typeof itemsMessage === 'string' && itemsMessage.trim()) {
        return itemsMessage;
    }

    return translateApiError(err);
}

export default function CartModal({
    isOpen,
    onClose,
    onOrderCreated,
    isStoreOpen = false,
    cartItems,
    onUpdateQuantity,
    onRemoveItem,
    deliveryZones = [],
}) {
    const [step, setStep] = useState('cart'); // 'cart' | 'checkout' | 'success'
    const [form, setForm] = useState(INITIAL_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [createdOrder, setCreatedOrder] = useState(null);
    const [saveWarning, setSaveWarning] = useState(false);
    const submitLock = useRef(false);
    const closeResetRef = useRef(null);

    useEffect(() => () => {
        window.clearTimeout(closeResetRef.current);
    }, []);

    const itemsTotal = cartItems.reduce((sum, item) => sum + cartItemTotal(item), 0);
    const selectedZone = deliveryZones.find((zone) => String(zone.id) === String(form.delivery_zone_id));
    const deliveryFee = form.type === 'delivery' ? Number(selectedZone?.fee_amount ?? 0) : 0;
    const grandTotal = itemsTotal + deliveryFee;

    const updateField = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }));
        setError(null);
    };

    const handleClose = () => {
        if (submitLock.current && step !== 'success') {
            return;
        }

        onClose?.();

        window.clearTimeout(closeResetRef.current);
        closeResetRef.current = window.setTimeout(() => {
            setStep('cart');
            setError(null);
            setCreatedOrder(null);
            setSaveWarning(false);
            setSubmitting(false);
            submitLock.current = false;
        }, 200);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (submitLock.current) {
            return;
        }

        submitLock.current = true;
        setError(null);

        const release = () => {
            submitLock.current = false;
            setSubmitting(false);
        };

        if (!isStoreOpen) {
            release();
            return;
        }

        if (cartItems.length === 0) {
            setError('Seu carrinho está vazio.');
            release();
            return;
        }

        const name = filterPersonName(form.customer_name).trim();
        const phone = maskPhone(form.customer_phone);
        const address = filterAddress(form.delivery_address).trim();
        const notes = cartItems.map((item) => filterNote(item.observation || '').trim());

        if (!isPersonName(name) || hasUnsafeText(name)) {
            setError('Informe seu nome usando apenas letras.');
            release();
            return;
        }

        if (!isPhoneNumber(phone) || hasUnsafeText(phone)) {
            setError('Informe o DDD e o número, no formato (DDD) 99999-9999.');
            release();
            return;
        }

        if (notes.some((note) => hasUnsafeText(note))) {
            setError('A observação só pode ter letras, números e pontuação simples.');
            release();
            return;
        }

        if (form.type === 'delivery') {
            if (address.length < 5 || hasUnsafeText(address)) {
                setError('Informe o endereço com rua e número, sem símbolos especiais.');
                release();
                return;
            }

            if (deliveryZones.length === 0 || !form.delivery_zone_id) {
                setError(deliveryZones.length === 0
                    ? 'Não há regiões de entrega disponíveis no momento.'
                    : 'Selecione uma região de entrega.');
                release();
                return;
            }
        }

        let changeFor;

        if (form.payment_method === 'dinheiro' && String(form.change_for).trim() !== '') {
            changeFor = Number(String(form.change_for).replace(',', '.'));

            if (!Number.isFinite(changeFor) || changeFor + 0.009 < grandTotal) {
                setError('O troco precisa ser maior ou igual ao total do pedido.');
                release();
                return;
            }
        }

        const payload = {
            customer_name: name,
            customer_phone: phone,
            type: form.type,
            payment_method: form.payment_method,
            change_for: changeFor,
            delivery_address: form.type === 'delivery' ? address : undefined,
            delivery_fee: form.type === 'delivery' ? deliveryFee : undefined,
            items: cartItems.map((item, index) => ({
                product_size_id: item.sizeId,
                quantity: item.quantity,
                observation: notes[index] || undefined,
                add_on_ids: (item.addOns ?? []).map((addOn) => addOn.id),
            })),
        };

        setSubmitting(true);

        try {
            const order = await publicApiFetch('/orders', {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            const saved = saveOrder(order);

            onOrderCreated?.();
            setForm(INITIAL_FORM);
            setSaveWarning(!saved);
            setCreatedOrder(order);
            setStep('success');
            setSubmitting(false);
        } catch (err) {
            setError(messageFromApi(err));
            release();
        }
    };

    const goToMyOrders = () => {
        handleClose();
        router.visit('/meus-pedidos');
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose}>
            {step === 'cart' && (
                <>
                    <ModalHeader title="Seu carrinho" onClose={handleClose} />

                    {cartItems.length === 0 && (
                        <NormalText fontSize="1.3rem">Seu carrinho está vazio.</NormalText>
                    )}

                    {cartItems.length > 0 && (
                        <div className="cartList">
                            {cartItems.map((item) => (
                                <div key={item.cartItemId} className="cartItem">
                                    <div className="cartItemInfo">
                                        <Title fontSize="1.4rem">{item.productName}</Title>
                                        <NormalText fontSize="1.2rem">
                                            {item.sizeName}
                                            {item.addOns?.length > 0 && ` · ${item.addOns.map((a) => a.name).join(', ')}`}
                                        </NormalText>
                                        {item.observation && (
                                            <NormalText fontSize="1.2rem">Obs: {item.observation}</NormalText>
                                        )}
                                        <Title fontSize="1.3rem">{formatPrice(cartItemTotal(item))}</Title>
                                    </div>

                                    <div className="cartItemActions">
                                        <div className="quantityControl">
                                            <button
                                                type="button"
                                                onClick={() => onUpdateQuantity(item.cartItemId, item.quantity - 1)}
                                            >
                                                <Minus size={14} color="var(--black)" />
                                            </button>
                                            <NormalText fontSize="1.3rem">{item.quantity}</NormalText>
                                            <button
                                                type="button"
                                                onClick={() => onUpdateQuantity(item.cartItemId, item.quantity + 1)}
                                            >
                                                <Plus size={14} color="var(--black)" />
                                            </button>
                                        </div>

                                        <button
                                            type="button"
                                            className="removeButton"
                                            onClick={() => onRemoveItem(item.cartItemId)}
                                        >
                                            <Trash2 size={16} color="var(--main-red)" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {cartItems.length > 0 && (
                        <div className="cartFooter">
                            <div className="cartTotalRow">
                                <Title fontSize="1.4rem">Total</Title>
                                <Title fontSize="1.4rem">{formatPrice(itemsTotal)}</Title>
                            </div>

                            {!isStoreOpen && (
                                <NormalText fontSize="1.3rem" color="var(--main-red)">
                                    A loja está fechada no momento.
                                </NormalText>
                            )}

                            <button type="button" className="cartConfirmButton" onClick={() => setStep('checkout')}>
                                Continuar
                            </button>
                        </div>
                    )}
                </>
            )}

            {step === 'checkout' && (
                <>
                    <ModalHeader title="Finalizar pedido" onClose={handleClose} />

                    <form className="checkoutForm" onSubmit={handleSubmit} noValidate>
                        <label className="formField">
                            <NormalText fontSize="1.2rem">Nome</NormalText>
                            <input
                                type="text"
                                autoComplete="name"
                                maxLength={80}
                                value={form.customer_name}
                                onChange={(e) => updateField('customer_name', filterPersonName(e.target.value))}
                            />
                        </label>

                        <label className="formField">
                            <NormalText fontSize="1.2rem">Telefone (DDD + número)</NormalText>
                            <input
                                type="tel"
                                inputMode="numeric"
                                autoComplete="tel"
                                maxLength={16}
                                placeholder="(DDD) 99999-9999"
                                value={form.customer_phone}
                                onChange={(e) => updateField('customer_phone', maskPhone(e.target.value))}
                            />
                        </label>

                        <div className="formField">
                            <NormalText fontSize="1.2rem">Tipo de pedido</NormalText>
                            <div className="segmentedControl">
                                <button
                                    type="button"
                                    className={form.type === 'pickup' ? 'segmentActive' : ''}
                                    onClick={() => updateField('type', 'pickup')}
                                >
                                    Retirada
                                </button>
                                <button
                                    type="button"
                                    className={form.type === 'delivery' ? 'segmentActive' : ''}
                                    onClick={() => updateField('type', 'delivery')}
                                >
                                    Entrega
                                </button>
                            </div>
                        </div>

                        {form.type === 'delivery' && (
                            <>
                                <label className="formField">
                                    <NormalText fontSize="1.2rem">Endereço completo</NormalText>
                                    <textarea
                                        rows={2}
                                        maxLength={180}
                                        value={form.delivery_address}
                                        onChange={(e) => updateField('delivery_address', filterAddress(e.target.value))}
                                    />
                                </label>

                                <label className="formField">
                                    <NormalText fontSize="1.2rem">Região de entrega</NormalText>
                                    {deliveryZones.length === 0 && (
                                        <NormalText fontSize="1.2rem" color="var(--main-red)">
                                            Não há regiões de entrega disponíveis no momento.
                                        </NormalText>
                                    )}
                                    {deliveryZones.length > 0 && (
                                        <select
                                            value={form.delivery_zone_id}
                                            onChange={(e) => updateField('delivery_zone_id', e.target.value)}
                                        >
                                            <option value="">Selecione...</option>
                                            {deliveryZones.map((zone) => (
                                                <option key={zone.id} value={zone.id}>
                                                    Até {zone.radius_km} km — {formatPrice(zone.fee_amount)}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </label>
                            </>
                        )}

                        <label className="formField">
                            <NormalText fontSize="1.2rem">Forma de pagamento</NormalText>
                            <select
                                value={form.payment_method}
                                onChange={(e) => updateField('payment_method', e.target.value)}
                            >
                                {Object.entries(PAYMENT_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                        </label>

                        {form.payment_method === 'dinheiro' && (
                            <label className="formField">
                                <NormalText fontSize="1.2rem">Troco para quanto? (opcional)</NormalText>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    inputMode="decimal"
                                    value={form.change_for}
                                    onChange={(e) => updateField('change_for', e.target.value)}
                                />
                            </label>
                        )}

                        {error && (
                            <NormalText fontSize="1.2rem" color="var(--main-red)">{error}</NormalText>
                        )}

                        {!isStoreOpen && (
                            <NormalText fontSize="1.3rem" color="var(--main-red)">
                                A loja está fechada no momento.
                            </NormalText>
                        )}

                        {form.type === 'delivery' && form.delivery_zone_id && (
                            <div className="cartTotalRow">
                                <NormalText fontSize="1.3rem" color="var(--black)">Taxa de entrega</NormalText>
                                <NormalText fontSize="1.3rem" color="var(--black)">{formatPrice(deliveryFee)}</NormalText>
                            </div>
                        )}

                        <div className="cartTotalRow">
                            <Title fontSize="1.4rem">Total</Title>
                            <Title fontSize="1.4rem">{formatPrice(grandTotal)}</Title>
                        </div>

                        <button
                            type="submit"
                            className="cartConfirmButton"
                            disabled={submitting || !isStoreOpen}
                        >
                            {submitting ? 'Enviando...' : `Confirmar pedido · ${formatPrice(grandTotal)}`}
                        </button>
                    </form>
                </>
            )}

            {step === 'success' && createdOrder && (
                <>
                    <ModalHeader title="Pedido enviado!" onClose={handleClose} />

                    <div className="cartSuccess">
                        <NormalText fontSize="1.4rem" color="var(--black)">
                            Pedido #{createdOrder.daily_number} recebido! Acompanhe o andamento em Meus Pedidos.
                        </NormalText>

                        <div className="cartTotalRow">
                            <Title fontSize="1.4rem">Total</Title>
                            <Title fontSize="1.4rem">{formatPrice(createdOrder.total_amount)}</Title>
                        </div>

                        {saveWarning && (
                            <NormalText fontSize="1.2rem" color="var(--main-red)">
                                Não conseguimos salvar o pedido neste navegador. Anote o número para acompanhar com a loja.
                            </NormalText>
                        )}

                        <button type="button" className="cartConfirmButton" onClick={goToMyOrders}>
                            Ver meus pedidos
                        </button>
                    </div>
                </>
            )}
        </Modal>
    );
}
