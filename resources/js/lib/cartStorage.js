import { filterNote } from './textInput';

const STORAGE_KEY = 'maialanches:carrinho';

function normalizeAddOn(addOn) {
    const id = Number(addOn?.id);

    if (!Number.isFinite(id)) {
        return null;
    }

    return {
        id,
        name: String(addOn.name ?? '').slice(0, 80),
        price: Number(addOn.price) || 0,
    };
}

function normalizeItem(item) {
    const quantity = Math.floor(Number(item?.quantity));
    const sizeId = Number(item?.sizeId);

    if (!item || !Number.isFinite(sizeId) || !Number.isFinite(quantity) || quantity <= 0) {
        return null;
    }

    const addOns = Array.isArray(item.addOns)
        ? item.addOns.map(normalizeAddOn).filter(Boolean)
        : [];

    return {
        cartItemId: String(item.cartItemId || `${Date.now()}-${Math.random().toString(36).slice(2)}`),
        signature: String(item.signature || `${sizeId}|${item.observation || ''}|${addOns.map((addOn) => addOn.id).sort().join(',')}`),
        productId: item.productId,
        productName: String(item.productName || 'Item').slice(0, 120),
        sizeId,
        sizeName: String(item.sizeName || ''),
        unitPrice: Number(item.unitPrice) || 0,
        addOns,
        observation: filterNote(item.observation || '').trim(),
        quantity: Math.min(quantity, 99),
    };
}

export function loadCart() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.map(normalizeItem).filter(Boolean);
    } catch (_) {
        return [];
    }
}

export function saveCart(cart) {
    try {
        const items = (Array.isArray(cart) ? cart : []).map(normalizeItem).filter(Boolean);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (_) {
        // sem localStorage o carrinho vive só até recarregar
    }
}
