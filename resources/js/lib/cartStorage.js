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

function money(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
        return 0;
    }

    return Math.round(number * 100) / 100;
}

function readSizes(product) {
    if (Array.isArray(product?.sizes)) {
        return product.sizes;
    }

    if (Array.isArray(product?.sizes?.data)) {
        return product.sizes.data;
    }

    return [];
}

export function repriceCart(cart, products, addOns) {
    if (!Array.isArray(cart) || cart.length === 0) {
        return cart;
    }

    const productById = new Map((products ?? []).map((product) => [Number(product.id), product]));
    const addOnById = new Map((addOns ?? []).map((addOn) => [Number(addOn.id), addOn]));
    let changed = false;

    const next = cart.map((item) => {
        const product = productById.get(Number(item.productId));
        const size = readSizes(product).find((entry) => Number(entry.id) === Number(item.sizeId));
        const currentAddOns = item.addOns ?? [];
        const nextAddOns = [];

        currentAddOns.forEach((addOn) => {
            const current = addOnById.get(Number(addOn.id));
            if (!current) {
                changed = true;
                return;
            }

            const price = money(current.price);
            const name = String(current.name ?? addOn.name);
            if (price !== money(addOn.price) || name !== addOn.name) {
                changed = true;
            }

            nextAddOns.push({ ...addOn, name, price });
        });

        const addOnTotal = nextAddOns.reduce((sum, addOn) => sum + addOn.price, 0);
        const unitPrice = size
            ? money(money(size.price) + addOnTotal)
            : money(money(item.unitPrice) - currentAddOns.reduce((sum, addOn) => sum + money(addOn.price), 0) + addOnTotal);
        const productName = product?.name ? String(product.name) : item.productName;
        const sizeName = size?.size_name ? String(size.size_name) : item.sizeName;
        const signature = `${item.sizeId}|${item.observation || ''}|${nextAddOns.map((addOn) => addOn.id).sort((a, b) => a - b).join(',')}`;

        if (
            unitPrice !== money(item.unitPrice)
            || productName !== item.productName
            || sizeName !== item.sizeName
            || signature !== item.signature
        ) {
            changed = true;
        }

        return {
            ...item,
            productName,
            sizeName,
            unitPrice,
            addOns: nextAddOns,
            signature,
        };
    });

    return changed ? next : cart;
}
