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
import { formatAddOnLabel, formatKm, formatPrice, parsePrice } from '../../lib/format';
import AddressAutocomplete from '../AddressAutocomplete/AddressAutocomplete';
import { useDirtyForm } from '../../lib/useDirtyForm';
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

const IDLE_QUOTE = {
    status: 'idle',
    distanceKm: null,
    feeAmount: null,
    error: null,
    retryable: false,
};

const ADDRESS_FIELDS = ['delivery_street', 'delivery_number', 'delivery_neighborhood'];

function whatsAppNode(contact) {
    const raw = typeof contact === 'string' ? contact.trim() : '';
    const digits = raw.replace(/\D/g, '');
    let phone = digits;

    if (digits.length === 10 || digits.length === 11) {
        phone = `55${digits}`;
    }

    if (phone.length >= 12) {
        return (
            <a href={`https://wa.me/${phone}`} target="_blank" rel="noreferrer">
                {raw || phone}
            </a>
        );
    }

    return raw || 'a loja';
}

function quoteErrorMessage(err) {
    if (err?.status === 503) {
        return typeof err.message === 'string' && /[áàâãéêíóôõúüç]/i.test(err.message)
            ? err.message
            : 'Não foi possível calcular a entrega agora. Tente novamente.';
    }

    const fields = getFieldErrors(err);
    const addressMessage = fields.address || fields.address_token || fields.street || fields.number || fields.neighborhood;

    if (addressMessage) {
        return addressMessage;
    }

    return translateApiError(err);
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
    storeContact = '',
    cartItems,
    cartNotice = null,
    onUpdateQuantity,
    onRemoveItem,
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
    const [quote, setQuote] = useState(IDLE_QUOTE);
    const [quoteAttempt, setQuoteAttempt] = useState(0);
    const [addressMode, setAddressMode] = useState('suggest');
    const [addressToken, setAddressToken] = useState(null);
    const [suggestAvailable, setSuggestAvailable] = useState(true);
    const submitLock = useRef(false);
    const closeResetRef = useRef(null);
    const idempotencyKeyRef = useRef(null);
    const quoteRequestRef = useRef(0);

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

    useEffect(() => {
        if (!isOpen || step !== 'checkout' || form.type !== 'delivery') {
            return undefined;
        }

        const street = filterStreet(form.delivery_street).trim();
        const number = filterHouseNumber(form.delivery_number).trim();
        const verified = addressMode === 'suggest' && Boolean(addressToken);
        const manualReady = addressMode === 'manual' && street.length >= 3;
        const valid = isHouseNumber(number) && (verified || manualReady);

        if (!valid) {
            setQuote(IDLE_QUOTE);
            return undefined;
        }

        const requestId = ++quoteRequestRef.current;
        setQuote({
            status: 'calculating',
            distanceKm: null,
            feeAmount: null,
            error: null,
            retryable: false,
        });

        const timer = window.setTimeout(async () => {
            try {
                const data = await publicApiFetch('/delivery-quote', {
                    method: 'POST',
                    body: JSON.stringify(verified
                        ? { address_token: addressToken, number }
                        : { street, number }),
                });

                if (requestId !== quoteRequestRef.current) {
                    return;
                }

                const distanceKm = Number(data?.distance_km);
                const feeAmount = Number(data?.fee_amount);

                if (!Number.isFinite(distanceKm) || !Number.isFinite(feeAmount)) {
                    setQuote({
                        status: 'error',
                        distanceKm: null,
                        feeAmount: null,
                        error: 'Não foi possível calcular a entrega agora. Tente novamente.',
                        retryable: true,
                    });
                    return;
                }

                setQuote({
                    status: 'ok',
                    distanceKm,
                    feeAmount,
                    error: null,
                    retryable: false,
                });
            } catch (err) {
                if (requestId !== quoteRequestRef.current) {
                    return;
                }

                const fields = getFieldErrors(err);

                if (fields.address_token) {
                    setFieldErrors((current) => ({
                        ...current,
                        delivery_street: fields.address_token,
                    }));
                }

                setQuote({
                    status: 'error',
                    distanceKm: null,
                    feeAmount: null,
                    error: quoteErrorMessage(err),
                    retryable: err?.status === 503,
                });
            }
        }, 800);

        return () => {
            window.clearTimeout(timer);
            quoteRequestRef.current += 1;
        };
    }, [
        isOpen,
        step,
        form.type,
        form.delivery_street,
        form.delivery_number,
        addressMode,
        addressToken,
        quoteAttempt,
    ]);

    const checkoutDirty = useDirtyForm({
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        delivery_street: form.delivery_street,
        delivery_number: form.delivery_number,
        delivery_neighborhood: form.delivery_neighborhood,
        delivery_reference: form.delivery_reference,
        change_for: form.change_for,
    });
    const blockDismiss = step !== 'success' && checkoutDirty;

    const itemsTotal = cartItems.reduce((sum, item) => sum + cartItemTotal(item), 0);
    const deliveryFee = form.type === 'delivery' && quote.status === 'ok' ? Number(quote.feeAmount) : 0;
    const grandTotal = itemsTotal + deliveryFee;
    const numberReady = isHouseNumber(filterHouseNumber(form.delivery_number).trim());
    const neighborhoodReady = filterNeighborhood(form.delivery_neighborhood).trim().length >= 2;
    const deliveryReady = form.type !== 'delivery' || (
        quote.status === 'ok'
        && numberReady
        && (addressMode === 'manual'
            ? neighborhoodReady && filterStreet(form.delivery_street).trim().length >= 3
            : Boolean(addressToken))
    );

    const updateField = (field, value) => {
        setForm((current) => ({
            ...current,
            [field]: value,
            ...(field === 'payment_method' && value !== 'dinheiro' ? { change_for: '' } : {}),
        }));
        setError(null);
        setFieldErrors((current) => ({ ...current, [field]: undefined, address: undefined }));

        if (field === 'type' || ADDRESS_FIELDS.includes(field)) {
            setQuote(IDLE_QUOTE);
        }
    };

    const resetAddress = () => {
        setAddressMode('suggest');
        setAddressToken(null);
        setSuggestAvailable(true);
        setForm((current) => ({
            ...current,
            delivery_street: '',
            delivery_number: '',
            delivery_neighborhood: '',
            delivery_reference: '',
        }));
    };

    const clearStreetError = () => {
        setFieldErrors((current) => ({
            ...current,
            delivery_street: undefined,
            delivery_neighborhood: undefined,
            address: undefined,
            address_token: undefined,
            place_id: undefined,
        }));
    };

    const handleStreetChange = (value) => {
        setAddressToken(null);
        setForm((current) => ({
            ...current,
            delivery_street: value,
            ...(addressToken ? { delivery_neighborhood: '' } : {}),
        }));
        setQuote(IDLE_QUOTE);
        setError(null);
        clearStreetError();
    };

    const handleResolved = ({ street, neighborhood, addressToken: token }) => {
        setAddressMode('suggest');
        setAddressToken(token || null);
        setForm((current) => ({
            ...current,
            delivery_street: filterStreet(street),
            delivery_neighborhood: filterNeighborhood(neighborhood),
        }));
        setQuote(IDLE_QUOTE);
        setError(null);
        clearStreetError();
    };

    const retryQuote = () => {
        setQuote({
            status: 'calculating',
            distanceKm: null,
            feeAmount: null,
            error: null,
            retryable: false,
        });
        setQuoteAttempt((current) => current + 1);
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
            setQuote(IDLE_QUOTE);
            resetAddress();
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

        if (cartItems.some((item) => {
            const addOns = item.addOns ?? [];
            const addonQuantityInvalid = addOns.some((addOn) => {
                const addonQuantity = Number(addOn.quantity);

                return !Number.isInteger(addonQuantity) || addonQuantity < 1 || addonQuantity > 10;
            });

            return item.quantity > 50 || item.quantity < 1 || addOns.length > 10 || addonQuantityInvalid;
        })) {
            errors.items = 'Cada item aceita de 1 a 50 unidades, no máximo 10 acréscimos e até 10 de cada.';
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
            if (addressMode === 'suggest' && !addressToken) {
                errors.delivery_street = street.length < 3
                    ? 'Informe a rua.'
                    : 'Selecione o endereço na lista.';
            }

            if (addressMode === 'manual' && street.length < 3) {
                errors.delivery_street = street.length === 0
                    ? 'Informe a rua.'
                    : 'A rua deve ter pelo menos 3 caracteres.';
            }

            if (!number) {
                errors.delivery_number = 'Informe o número.';
            } else if (!isHouseNumber(number)) {
                errors.delivery_number = 'Informe o número (ex.: 123, 123A) ou S/N.';
            }

            if (addressMode === 'manual' && neighborhood.length < 2) {
                errors.delivery_neighborhood = neighborhood.length === 0
                    ? 'Informe o bairro.'
                    : 'O bairro deve ter pelo menos 2 caracteres.';
            }

            if (quote.status !== 'ok') {
                errors.address = quote.error || 'Aguarde o cálculo da entrega.';
            }
        }

        let changeFor;

        if (form.payment_method === 'dinheiro' && String(form.change_for).trim() !== '') {
            const raw = String(form.change_for).trim();
            const normalized = raw.includes(',')
                ? raw.replace(/\./g, '').replace(',', '.')
                : raw;

            if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
                errors.change_for = 'Informe um valor válido, ex.: 50,00.';
            } else if (Number(normalized) > 9999.99) {
                errors.change_for = 'O troco não pode ser maior que 9999.99.';
            } else {
                changeFor = parsePrice(raw);
                const changeCents = Math.round(Number(changeFor) * 100);
                const totalCents = Math.round(grandTotal * 100);

                if (changeFor === null) {
                    errors.change_for = 'Informe um valor válido, ex.: 50,00.';
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
                add_ons: (item.addOns ?? []).map((addOn) => ({
                    id: addOn.id,
                    quantity: addOn.quantity,
                })),
            })),
        };

        if (form.type === 'delivery') {
            payload.delivery_number = number;
            if (reference) {
                payload.delivery_reference = reference;
            }
            if (addressMode === 'suggest' && addressToken) {
                payload.address_token = addressToken;
            } else {
                payload.delivery_street = street;
                payload.delivery_neighborhood = neighborhood;
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
            setAddressMode('suggest');
            setAddressToken(null);
            setSuggestAvailable(true);
            setSaveWarning(!saved);
            setCreatedOrder(order);
            setStep('success');
            setSubmitting(false);
        } catch (err) {
            const fields = getFieldErrors(err);

            if (fields.address_token || fields.place_id) {
                fields.delivery_street = fields.address_token || fields.place_id;
            }

            const inlineKeys = [
                'customer_name',
                'customer_phone',
                'delivery_street',
                'delivery_number',
                'delivery_neighborhood',
                'delivery_reference',
                'address',
                'payment_method',
                'change_for',
            ];
            const extra = Object.entries(fields).filter(([key]) => !inlineKeys.includes(key));

            if (fields.address || err?.status === 503) {
                setQuote({
                    status: 'error',
                    distanceKm: null,
                    feeAmount: null,
                    error: fields.address || quoteErrorMessage(err),
                    retryable: err?.status === 503,
                });
            }

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
        <Modal isOpen={isOpen} onClose={handleClose} blockDismiss={blockDismiss}>
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
                                            {item.addOns?.length > 0 && ` · ${item.addOns.map((addOn) => formatAddOnLabel(addOn)).join(', ')}`}
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
                                <AddressAutocomplete
                                    mode={addressMode}
                                    suggestAvailable={suggestAvailable}
                                    street={form.delivery_street}
                                    number={form.delivery_number}
                                    neighborhood={form.delivery_neighborhood}
                                    reference={form.delivery_reference}
                                    addressToken={addressToken}
                                    fieldErrors={fieldErrors}
                                    onStreetChange={handleStreetChange}
                                    onNumberChange={(value) => updateField('delivery_number', value)}
                                    onNeighborhoodChange={(value) => updateField('delivery_neighborhood', value)}
                                    onReferenceChange={(value) => updateField('delivery_reference', value)}
                                    onResolved={handleResolved}
                                    onUseManual={() => {
                                        setAddressMode('manual');
                                        setAddressToken(null);
                                        setQuote(IDLE_QUOTE);
                                        clearStreetError();
                                    }}
                                    onUseSuggest={() => {
                                        setSuggestAvailable(true);
                                        setAddressMode('suggest');
                                        setAddressToken(null);
                                        setForm((current) => ({ ...current, delivery_neighborhood: '' }));
                                        setQuote(IDLE_QUOTE);
                                        clearStreetError();
                                    }}
                                    onUnavailable={() => {
                                        setSuggestAvailable(false);
                                        setAddressMode('manual');
                                        setAddressToken(null);
                                    }}
                                />

                                {quote.status === 'calculating' && (
                                    <NormalText fontSize="1.2rem">Calculando a entrega...</NormalText>
                                )}
                                {quote.status === 'ok' && (
                                    <NormalText fontSize="1.2rem">
                                        Distância {formatKm(quote.distanceKm)} km · Taxa de entrega {formatPrice(quote.feeAmount)}
                                    </NormalText>
                                )}
                                {quote.status === 'error' && (
                                    <div className="formField cartQuoteError">
                                        <NormalText fontSize="1.2rem" color="var(--main-red)">
                                            {addressMode === 'manual' && typeof quote.error === 'string' && quote.error.includes('Não encontramos esse endereço')
                                                ? (
                                                    <>
                                                        Não encontramos esse endereço. Fale com a loja pelo WhatsApp: {whatsAppNode(storeContact)}
                                                    </>
                                                )
                                                : quote.error}
                                        </NormalText>
                                        {quote.retryable && (
                                            <button type="button" className="cartQuoteRetry" onClick={retryQuote}>
                                                Tentar de novo
                                            </button>
                                        )}
                                    </div>
                                )}
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
                                    type="text"
                                    inputMode="decimal"
                                    autoComplete="off"
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

                        {form.type === 'delivery' && quote.status === 'ok' && (
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
                                || !deliveryReady
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
