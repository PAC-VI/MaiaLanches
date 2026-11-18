import { filterNote } from './textInput';

const STORAGE_KEY = 'maialanches:carrinho';

export function cartSignature(sizeId, observation, addOns) {
    const encoded = (Array.isArray(addOns) ? addOns : [])
        .map((addOn) => {
            const id = Number(addOn?.id);

            if (!Number.isFinite(id)) {
                return null;
            }

            const quantity = Math.floor(Number(addOn?.quantity));
            const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;

            return { id, quantity: safeQuantity };
        })
        .filter(Boolean)
        .sort((a, b) => a.id - b.id)
        .map((addOn) => `${addOn.id}:${addOn.quantity}`)
        .join(',');

    return `${Number(sizeId)}|${observation ?? ''}|${encoded}`;
}

function addonQuantity(addOn) {
    const quantity = Math.floor(Number(addOn?.quantity));

    if (!Number.isFinite(quantity) || quantity < 1) {
        return 1;
    }

    return Math.min(quantity, 10);
}

function normalizeAddOn(addOn) {
    const id = Number(addOn?.id);

    if (!Number.isFinite(id)) {
        return null;
    }

    return {
        id,
        name: String(addOn.name ?? '').slice(0, 60),
        price: Number(addOn.price) || 0,
        quantity: addonQuantity(addOn),
    };
}

function normalizeAddOns(list) {
    const merged = new Map();

    (Array.isArray(list) ? list : []).forEach((entry) => {
        const addOn = normalizeAddOn(entry);

        if (!addOn) {
            return;
        }

        const existing = merged.get(addOn.id);

        if (existing) {
            existing.quantity = Math.min(10, existing.quantity + addOn.quantity);
            return;
        }

        if (merged.size >= 10) {
            return;
        }

        merged.set(addOn.id, addOn);
    });

    return [...merged.values()];
}

function normalizeItem(item) {
    const quantity = Math.floor(Number(item?.quantity));
    const sizeId = Number(item?.sizeId);

    if (!item || !Number.isFinite(sizeId) || !Number.isFinite(quantity) || quantity <= 0) {
        return null;
    }

    const addOns = normalizeAddOns(item.addOns);
    const observation = filterNote(item.observation || '').trim();

    return {
        cartItemId: String(item.cartItemId || `${Date.now()}-${Math.random().toString(36).slice(2)}`),
        signature: cartSignature(sizeId, observation, addOns),
        productId: item.productId,
        productName: String(item.productName || 'Item').slice(0, 80),
        sizeId,
        sizeName: String(item.sizeName || ''),
        unitPrice: Number(item.unitPrice) || 0,
        addOns,
        observation,
        quantity: Math.min(quantity, 50),
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

function removalNotice(names) {
    const list = names.filter(Boolean);

    if (list.length === 1) {
        return `${list[0]} saiu do carrinho porque o tamanho ou o acréscimo não está mais disponível.`;
    }

    return `Estes itens saíram do carrinho porque o tamanho ou o acréscimo não está mais disponível: ${list.join(', ')}.`;
}

function addOnAppliesToProduct(addOn, product) {
    const categoryId = Number(product?.category_id);
    const ids = Array.isArray(addOn?.category_ids) ? addOn.category_ids : [];

    if (!Number.isFinite(categoryId)) {
        return false;
    }

    return ids.some((id) => Number(id) === categoryId);
}

function stripNotice(entries) {
    if (entries.length === 1) {
        return `O acréscimo ${entries[0].addOnName} saiu de ${entries[0].productName} porque não está disponível para esse produto.`;
    }

    const list = entries.map((entry) => `${entry.addOnName} (${entry.productName})`);

    return `Estes acréscimos saíram do carrinho porque não estão disponíveis para o produto: ${list.join(', ')}.`;
}

export function repriceCart(cart, products, addOns) {
    const source = Array.isArray(cart) ? cart : [];

    if (source.length === 0) {
        return { cart: source, notice: null };
    }

    const productById = new Map((products ?? []).map((product) => [Number(product.id), product]));
    const addOnById = new Map((addOns ?? []).map((addOn) => [Number(addOn.id), addOn]));
    let changed = false;
    const removedNames = [];
    const stripped = [];
    const next = [];

    source.forEach((item) => {
        const product = productById.get(Number(item.productId));
        const size = readSizes(product).find((entry) => Number(entry.id) === Number(item.sizeId));
        const currentAddOns = item.addOns ?? [];

        if (!size || size.is_active === false) {
            changed = true;
            removedNames.push(item.productName || 'Item');
            return;
        }

        const nextAddOns = [];

        currentAddOns.forEach((addOn) => {
            const current = addOnById.get(Number(addOn.id));
            const quantity = addonQuantity(addOn);

            if (!current || current.is_active === false || !addOnAppliesToProduct(current, product)) {
                changed = true;
                stripped.push({
                    addOnName: String(current?.name || addOn.name || 'Acréscimo'),
                    productName: item.productName || product?.name || 'Item',
                });
                return;
            }

            const price = money(current.price);
            const name = String(current.name ?? addOn.name);

            if (price !== money(addOn.price) || name !== addOn.name || quantity !== addOn.quantity) {
                changed = true;
            }

            nextAddOns.push({ ...addOn, name, price, quantity });
        });

        const addOnCents = nextAddOns.reduce(
            (sum, addOn) => sum + Math.round(addOn.price * 100) * addOn.quantity,
            0,
        );
        const unitPrice = money((Math.round(Number(size.price) * 100) + addOnCents) / 100);
        const productName = product?.name ? String(product.name) : item.productName;
        const sizeName = size?.size_name ? String(size.size_name) : item.sizeName;
        const signature = cartSignature(item.sizeId, item.observation || '', nextAddOns);

        if (
            unitPrice !== money(item.unitPrice)
            || productName !== item.productName
            || sizeName !== item.sizeName
            || signature !== item.signature
        ) {
            changed = true;
        }

        next.push({
            ...item,
            productName,
            sizeName,
            unitPrice,
            addOns: nextAddOns,
            signature,
        });
    });

    const notices = [];

    if (removedNames.length > 0) {
        notices.push(removalNotice(removedNames));
    }

    if (stripped.length > 0) {
        notices.push(stripNotice(stripped));
    }

    return {
        cart: changed ? next : source,
        notice: notices.length > 0 ? notices.join(' ') : null,
    };
}
