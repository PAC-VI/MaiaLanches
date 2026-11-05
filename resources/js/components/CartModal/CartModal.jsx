import './CartModal.css';

import Modal from '../Modal/Modal';
import ModalHeader from '../ModalHeader/ModalHeader';

import { useEffect, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Title, NormalText } from '../../../styles/globalStyles';
import { publicApiFetch } from '../../lib/publicApi';
import { saveOrder } from '../../lib/orderStorage';
import { getFieldErrors, translateApiError } from '../../lib/apiErrors';
import { formatPrice } from '../../lib/format';
import {
    filterHouseNumber,
    filterNeighborhood,
    filterNote,
    filterPersonName,
    filterReference,
    filterStreet,
    isHouseNumber,
    isPersonName,
    isPhoneNumber,
    maskPhone,
} from '../../lib/textInput';

const INITIAL_FORM = {
    customer_name: '',
    customer_phone: '',
    type: 'pickup',
    delivery_street: '',
    delivery_number: '',
    delivery_neighborhood: '',
    delivery_reference: '',
    delivery_zone_id: '',
    payment_method: 'pix',
    change_for: '',
};

function newIdempotencyKey() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
        const random = Math.floor(Math.random() * 16);
        const value = char === 'x' ? random : ((random & 0x3) | 0x8);

        return value.toString(16);
    });
}

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
    cartNotice = null,
    onUpdateQuantity,
    onRemoveItem,
    deliveryZones = [],
}) {
    const [step, setStep] = useState('cart'); // 'cart' | 'checkout' | 'success'
    const [form, setForm] = useState(INITIAL_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});
    const [createdOrder, setCreatedOrder] = useState(null);
    const [saveWarning, setSaveWarning] = useState(false);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [paymentsLoading, setPaymentsLoading] = useState(false);
    const [paymentsError, setPaymentsError] = useState(null);
    const submitLock = useRef(false);
    const closeResetRef = useRef(null);
    const idempotencyKeyRef = useRef(null);

    useEffect(() => () => {
        window.clearTimeout(closeResetRef.current);
    }, []);

    useEffect(() => {
        if (!isOpen || step !== 'checkout') {
            return undefined;
        }

        let cancelled = false;

        const loadPayments = async (silent) => {
            if (!silent) {
                setPaymentsLoading(true);
                setPaymentsError(null);
            }

            try {
                const data = await publicApiFetch('/payment-methods');

                if (cancelled) {
                    return;
                }

                const list = (Array.isArray(data) ? data : [])
                    .filter((method) => method?.code && method?.label);

                setPaymentMethods(list);
                setPaymentsError(null);
                setForm((current) => {
                    if (list.some((method) => method.code === current.payment_method)) {
                        return current;
                    }

                    return {
                        ...current,
                        payment_method: list[0]?.code ?? '',
                        change_for: '',
                    };
                });
            } catch (err) {
                if (!cancelled && !silent) {
                    setPaymentMethods([]);
                    setPaymentsError(translateApiError(err));
                }
            } finally {
                if (!cancelled && !silent) {
                    setPaymentsLoading(false);
                }
            }
        };

        loadPayments(false);

        const onVisible = () => {
            if (document.visibilityState === 'visible') {
                loadPayments(true);
            }
        };

        document.addEventListener('visibilitychange', onVisible);

        return () => {
            cancelled = true;
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [isOpen, step]);

    const itemsTotal = cartItems.reduce((sum, item) => sum + cartItemTotal(item), 0);
    const selectedZone = deliveryZones.find((zone) => String(zone.id) === String(form.delivery_zone_id));
    const deliveryFee = form.type === 'delivery' ? Number(selectedZone?.fee_amount ?? 0) : 0;
    const grandTotal = itemsTotal + deliveryFee;

    const updateField = (field, value) => {
        setForm((current) => ({
            ...current,
            [field]: value,
            ...(field === 'payment_method' && value !== 'dinheiro' ? { change_for: '' } : {}),
        }));
        setError(null);
        setFieldErrors((current) => ({ ...current, [field]: undefined }));
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
            setFieldErrors({});
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
        setFieldErrors({});

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
        const street = filterStreet(form.delivery_street).trim();
        const number = filterHouseNumber(form.delivery_number).trim();
        const neighborhood = filterNeighborhood(form.delivery_neighborhood).trim();
        const reference = filterReference(form.delivery_reference).trim();
        const notes = cartItems.map((item) => filterNote(item.observation || '').trim());

        const errors = {};

        if (cartItems.length > 30) {
            errors.items = 'O pedido pode ter no máximo 30 itens.';
        }

        if (cartItems.some((item) => item.quantity > 50 || item.quantity < 1 || (item.addOns ?? []).length > 10)) {
            errors.items = 'Cada item aceita de 1 a 50 unidades e no máximo 10 acréscimos.';
        }

        if (!isPersonName(name)) {
            errors.customer_name = 'Informe seu nome usando apenas letras.';
        }

        if (!isPhoneNumber(phone)) {
            errors.customer_phone = 'Informe um telefone com DDD de 11 a 99. No celular, use 11 dígitos começando com 9.';
        }

        const selectedPayment = paymentMethods.find((method) => method.code === form.payment_method);

        if (paymentsLoading || paymentsError || !selectedPayment) {
            errors.payment_method = paymentsError || (paymentsLoading
                ? 'Aguarde as formas de pagamento.'
                : 'Escolha uma forma de pagamento disponível.');
        }

        if (form.type === 'delivery') {
            if (street.length < 3) {
                errors.delivery_street = street.length === 0
                    ? 'Informe a rua.'
                    : 'A rua deve ter pelo menos 3 caracteres.';
            }

            if (!number) {
                errors.delivery_number = 'Informe o número.';
            } else if (!isHouseNumber(number)) {
                errors.delivery_number = 'Informe o número (ex.: 123, 123A) ou S/N.';
            }

            if (neighborhood.length < 2) {
                errors.delivery_neighborhood = neighborhood.length === 0
                    ? 'Informe o bairro.'
                    : 'O bairro deve ter pelo menos 2 caracteres.';
            }

            if (deliveryZones.length === 0 || !form.delivery_zone_id) {
                errors.delivery_zone_id = deliveryZones.length === 0
                    ? 'Não há regiões de entrega disponíveis no momento.'
                    : 'Selecione uma região de entrega.';
            }
        }

        let changeFor;

        if (form.payment_method === 'dinheiro' && String(form.change_for).trim() !== '') {
            const raw = String(form.change_for).trim().replace(',', '.');

            if (!/^\d+(\.\d{1,2})?$/.test(raw)) {
                errors.change_for = 'O troco deve ter no máximo 2 casas decimais.';
            } else {
                changeFor = Number(raw);
                const changeCents = Math.round(changeFor * 100);
                const totalCents = Math.round(grandTotal * 100);

                if (changeFor > 9999.99) {
                    errors.change_for = 'O troco não pode ser maior que 9999.99.';
                } else if (changeCents < totalCents) {
                    errors.change_for = 'O troco precisa ser maior ou igual ao total do pedido.';
                }
            }
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            setError(errors.items || null);
            release();
            return;
        }

        const payload = {
            customer_name: name,
            customer_phone: phone,
            type: form.type,
            payment_method: form.payment_method,
            change_for: changeFor,
            items: cartItems.map((item, index) => ({
                product_size_id: item.sizeId,
                quantity: item.quantity,
                observation: notes[index] || undefined,
                add_on_ids: (item.addOns ?? []).map((addOn) => addOn.id),
            })),
        };

        if (form.type === 'delivery') {
            payload.delivery_street = street;
            payload.delivery_number = number;
            payload.delivery_neighborhood = neighborhood;
            payload.delivery_zone_id = Number(form.delivery_zone_id);
            if (reference) {
                payload.delivery_reference = reference;
            }
        }

        if (!idempotencyKeyRef.current) {
            idempotencyKeyRef.current = newIdempotencyKey();
        }

        setSubmitting(true);

        try {
            const order = await publicApiFetch('/orders', {
                method: 'POST',
                headers: { 'Idempotency-Key': idempotencyKeyRef.current },
                body: JSON.stringify(payload),
            });

            idempotencyKeyRef.current = null;

            const saved = saveOrder(order);

            onOrderCreated?.();
            setForm(INITIAL_FORM);
            setSaveWarning(!saved);
            setCreatedOrder(order);
            setStep('success');
            setSubmitting(false);
        } catch (err) {
            const fields = getFieldErrors(err);
            const inlineKeys = [
                'customer_name',
                'customer_phone',
                'delivery_street',
                'delivery_number',
                'delivery_neighborhood',
                'delivery_reference',
                'delivery_zone_id',
                'payment_method',
                'change_for',
            ];
            const extra = Object.entries(fields).filter(([key]) => !inlineKeys.includes(key));

            setFieldErrors(fields);
            setError(extra.length > 0 ? extra.map(([, message]) => message).join(' ') : (
                inlineKeys.some((key) => fields[key]) ? null : messageFromApi(err)
            ));
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

                    {cartNotice && (
                        <NormalText fontSize="1.3rem" color="var(--main-red)">
                            {cartNotice}
                        </NormalText>
                    )}

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
                                                aria-label="Aumentar quantidade"
                                                disabled={item.quantity >= 50}
                                                onClick={() => onUpdateQuantity(item.cartItemId, Math.min(50, item.quantity + 1))}
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

                            <button
                                type="button"
                                className="cartConfirmButton"
                                onClick={() => {
                                    if (!idempotencyKeyRef.current) {
                                        idempotencyKeyRef.current = newIdempotencyKey();
                                    }
                                    setPaymentsLoading(true);
                                    setPaymentsError(null);
                                    setStep('checkout');
                                }}
                            >
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
                            {fieldErrors.customer_name ? (
                                <NormalText fontSize="1.2rem" color="var(--main-red)">{fieldErrors.customer_name}</NormalText>
                            ) : null}
                        </label>

                        <label className="formField">
                            <NormalText fontSize="1.2rem">Telefone (DDD + número)</NormalText>
                            <input
                                type="tel"
                                inputMode="numeric"
                                autoComplete="tel"
                                maxLength={15}
                                placeholder="(DDD) 99999-9999"
                                value={form.customer_phone}
                                onChange={(e) => updateField('customer_phone', maskPhone(e.target.value))}
                            />
                            {fieldErrors.customer_phone ? (
                                <NormalText fontSize="1.2rem" color="var(--main-red)">{fieldErrors.customer_phone}</NormalText>
                            ) : null}
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
                                <div className="addressLine">
                                    <label className="formField">
                                        <NormalText fontSize="1.2rem">Rua</NormalText>
                                        <input
                                            type="text"
                                            autoComplete="address-line1"
                                            maxLength={80}
                                            value={form.delivery_street}
                                            onChange={(e) => updateField('delivery_street', filterStreet(e.target.value))}
                                        />
                                        {fieldErrors.delivery_street ? (
                                            <NormalText fontSize="1.2rem" color="var(--main-red)">{fieldErrors.delivery_street}</NormalText>
                                        ) : null}
                                    </label>

                                    <label className="formField">
                                        <NormalText fontSize="1.2rem">Número</NormalText>
                                        <input
                                            type="text"
                                            inputMode="text"
                                            autoComplete="off"
                                            maxLength={10}
                                            placeholder="123 ou S/N"
                                            value={form.delivery_number}
                                            onChange={(e) => updateField('delivery_number', filterHouseNumber(e.target.value))}
                                        />
                                        {fieldErrors.delivery_number ? (
                                            <NormalText fontSize="1.2rem" color="var(--main-red)">{fieldErrors.delivery_number}</NormalText>
                                        ) : null}
                                    </label>
                                </div>

                                <label className="formField">
                                    <NormalText fontSize="1.2rem">Bairro</NormalText>
                                    <input
                                        type="text"
                                        autoComplete="off"
                                        maxLength={60}
                                        value={form.delivery_neighborhood}
                                        onChange={(e) => updateField('delivery_neighborhood', filterNeighborhood(e.target.value))}
                                    />
                                    {fieldErrors.delivery_neighborhood ? (
                                        <NormalText fontSize="1.2rem" color="var(--main-red)">{fieldErrors.delivery_neighborhood}</NormalText>
                                    ) : null}
                                </label>

                                <label className="formField">
                                    <NormalText fontSize="1.2rem">Referência (opcional)</NormalText>
                                    <input
                                        type="text"
                                        autoComplete="off"
                                        maxLength={80}
                                        value={form.delivery_reference}
                                        onChange={(e) => updateField('delivery_reference', filterReference(e.target.value))}
                                    />
                                    {fieldErrors.delivery_reference ? (
                                        <NormalText fontSize="1.2rem" color="var(--main-red)">{fieldErrors.delivery_reference}</NormalText>
                                    ) : null}
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
                                    {fieldErrors.delivery_zone_id ? (
                                        <NormalText fontSize="1.2rem" color="var(--main-red)">{fieldErrors.delivery_zone_id}</NormalText>
                                    ) : null}
                                </label>
                            </>
                        )}

                        <label className="formField">
                            <NormalText fontSize="1.2rem">Forma de pagamento</NormalText>
                            {paymentsLoading && (
                                <NormalText fontSize="1.2rem">Carregando formas de pagamento...</NormalText>
                            )}
                            {!paymentsLoading && paymentsError && (
                                <NormalText fontSize="1.2rem" color="var(--main-red)">{paymentsError}</NormalText>
                            )}
                            {!paymentsLoading && !paymentsError && paymentMethods.length === 0 && (
                                <NormalText fontSize="1.2rem" color="var(--main-red)">
                                    Nenhuma forma de pagamento disponível no momento.
                                </NormalText>
                            )}
                            {!paymentsLoading && !paymentsError && paymentMethods.length > 0 && (
                                <select
                                    value={form.payment_method}
                                    onChange={(e) => updateField('payment_method', e.target.value)}
                                >
                                    {paymentMethods.map((method) => (
                                        <option key={method.code} value={method.code}>{method.label}</option>
                                    ))}
                                </select>
                            )}
                            {fieldErrors.payment_method ? (
                                <NormalText fontSize="1.2rem" color="var(--main-red)">{fieldErrors.payment_method}</NormalText>
                            ) : null}
                        </label>

                        {form.payment_method === 'dinheiro' && (
                            <label className="formField">
                                <NormalText fontSize="1.2rem">Troco para quanto? (opcional)</NormalText>
                                <input
                                    type="number"
                                    min="0"
                                    max="9999.99"
                                    step="0.01"
                                    inputMode="decimal"
                                    value={form.change_for}
                                    onChange={(e) => updateField('change_for', e.target.value)}
                                />
                                {fieldErrors.change_for ? (
                                    <NormalText fontSize="1.2rem" color="var(--main-red)">{fieldErrors.change_for}</NormalText>
                                ) : null}
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
                            disabled={
                                submitting
                                || !isStoreOpen
                                || paymentsLoading
                                || Boolean(paymentsError)
                                || !paymentMethods.some((method) => method.code === form.payment_method)
                            }
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
                            Pedido #{createdOrder.number} recebido! Acompanhe o andamento em Meus Pedidos.
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
