import './CartModal.css';

import Modal from '../Modal/Modal';
import ModalHeader from '../ModalHeader/ModalHeader';

import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Title, NormalText } from '../../../styles/globalStyles';
import { publicApiFetch } from '../../lib/publicApi';
import { saveOrder } from '../../lib/orderStorage';

const PAYMENT_LABELS = {
    dinheiro: 'Dinheiro',
    cartao: 'Cartão',
    pix: 'Pix',
};

function formatPrice(value) {
    return `R$ ${Number(value).toFixed(2).replace('.', ',')}`;
}

function cartItemTotal(item) {
    return item.unitPrice * item.quantity;
}

export default function CartModal({
    isOpen,
    onClose,
    cartItems,
    onUpdateQuantity,
    onRemoveItem,
    deliveryZones = [],
}) {
    const [step, setStep] = useState('cart'); // 'cart' | 'checkout' | 'success'
    const [form, setForm] = useState({
        customer_name: '',
        customer_phone: '',
        customer_cpf: '',
        type: 'pickup',
        delivery_address: '',
        delivery_zone_id: '',
        payment_method: 'pix',
        change_for: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [createdOrder, setCreatedOrder] = useState(null);

    const itemsTotal = cartItems.reduce((sum, item) => sum + cartItemTotal(item), 0);
    const selectedZone = deliveryZones.find((zone) => String(zone.id) === String(form.delivery_zone_id));
    const deliveryFee = form.type === 'delivery' ? Number(selectedZone?.fee_amount ?? 0) : 0;
    const grandTotal = itemsTotal + deliveryFee;

    const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

    const handleClose = () => {
        onClose?.();
        // Só volta pro passo inicial depois de fechado, pra não "piscar"
        // o carrinho enquanto a animação de fechamento ainda roda.
        window.setTimeout(() => {
            setStep('cart');
            setError(null);
            setCreatedOrder(null);
        }, 200);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(null);

        if (form.type === 'delivery' && !form.delivery_zone_id) {
            setError('Selecione uma região de entrega.');
            return;
        }

        const payload = {
            customer_name: form.customer_name.trim(),
            customer_phone: form.customer_phone.trim(),
            customer_cpf: form.customer_cpf.trim() || undefined,
            type: form.type,
            payment_method: form.payment_method,
            change_for: form.payment_method === 'dinheiro' && form.change_for
                ? Number(form.change_for)
                : undefined,
            delivery_address: form.type === 'delivery' ? form.delivery_address.trim() : undefined,
            delivery_fee: form.type === 'delivery' ? deliveryFee : undefined,
            items: cartItems.map((item) => ({
                product_size_id: item.sizeId,
                quantity: item.quantity,
                observation: item.observation || undefined,
                add_on_ids: item.addOns.map((addOn) => addOn.id),
            })),
        };

        setSubmitting(true);

        try {
            const order = await publicApiFetch('/orders', {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            // Guarda o pedido no localStorage deste navegador (id + token +
            // status), pra aparecer em "Meus Pedidos" e ser acompanhado por
            // polling — ver lib/orderStorage.js e lib/orderStatusPolling.js.
            saveOrder(order);

            setCreatedOrder(order);
            setStep('success');
        } catch (err) {
            if (err.errors) {
                const firstMessage = Object.values(err.errors)[0]?.[0];
                setError(firstMessage || err.message);
            } else {
                setError(err.message || 'Não foi possível enviar o pedido. Tente novamente.');
            }
        } finally {
            setSubmitting(false);
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
                                            {item.addOns.length > 0 && ` · ${item.addOns.map((a) => a.name).join(', ')}`}
                                        </NormalText>
                                        {item.observation && (
                                            <NormalText fontSize="1.2rem">Obs: {item.observation}</NormalText>
                                        )}
                                        <Title fontSize="1.3rem">{formatPrice(cartItemTotal(item))}</Title>
                                    </div>

                                    <div className="cartItemActions">
                                        <div className="quantityControl">
                                            <button
                                                onClick={() => onUpdateQuantity(item.cartItemId, item.quantity - 1)}
                                            >
                                                <Minus size={14} color="var(--black)" />
                                            </button>
                                            <NormalText fontSize="1.3rem">{item.quantity}</NormalText>
                                            <button
                                                onClick={() => onUpdateQuantity(item.cartItemId, item.quantity + 1)}
                                            >
                                                <Plus size={14} color="var(--black)" />
                                            </button>
                                        </div>

                                        <button
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

                            <button className="cartConfirmButton" onClick={() => setStep('checkout')}>
                                Continuar
                            </button>
                        </div>
                    )}
                </>
            )}

            {step === 'checkout' && (
                <>
                    <ModalHeader title="Finalizar pedido" onClose={handleClose} />

                    <form className="checkoutForm" onSubmit={handleSubmit}>
                        <label className="formField">
                            <NormalText fontSize="1.2rem">Nome</NormalText>
                            <input
                                type="text"
                                required
                                value={form.customer_name}
                                onChange={(e) => updateField('customer_name', e.target.value)}
                            />
                        </label>

                        <label className="formField">
                            <NormalText fontSize="1.2rem">Telefone (com DDD)</NormalText>
                            <input
                                type="tel"
                                required
                                value={form.customer_phone}
                                onChange={(e) => updateField('customer_phone', e.target.value)}
                            />
                        </label>

                        <label className="formField">
                            <NormalText fontSize="1.2rem">CPF (opcional)</NormalText>
                            <input
                                type="text"
                                value={form.customer_cpf}
                                onChange={(e) => updateField('customer_cpf', e.target.value)}
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
                                        required
                                        rows={2}
                                        value={form.delivery_address}
                                        onChange={(e) => updateField('delivery_address', e.target.value)}
                                    />
                                </label>

                                <label className="formField">
                                    <NormalText fontSize="1.2rem">Região de entrega</NormalText>
                                    <select
                                        required
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
                                    value={form.change_for}
                                    onChange={(e) => updateField('change_for', e.target.value)}
                                />
                            </label>
                        )}

                        {error && <NormalText fontSize="1.2rem" style={{ color: 'var(--main-red)' }}>{error}</NormalText>}

                        <div className="cartTotalRow">
                            <Title fontSize="1.4rem">Total</Title>
                            <Title fontSize="1.4rem">{formatPrice(grandTotal)}</Title>
                        </div>

                        <button type="submit" className="cartConfirmButton" disabled={submitting}>
                            {submitting ? 'Enviando...' : `Confirmar pedido · ${formatPrice(grandTotal)}`}
                        </button>
                    </form>
                </>
            )}

            {step === 'success' && createdOrder && (
                <>
                    <ModalHeader title="Pedido enviado!" onClose={handleClose} />

                    <NormalText fontSize="1.4rem">
                        Seu pedido <strong>#{createdOrder.daily_number}</strong> foi recebido e já está sendo
                        preparado. Você pode acompanhar o status a qualquer momento em "Meus Pedidos".
                    </NormalText>

                    <button className="cartConfirmButton" onClick={goToMyOrders}>
                        Ver meus pedidos
                    </button>
                </>
            )}
        </Modal>
    );
}
