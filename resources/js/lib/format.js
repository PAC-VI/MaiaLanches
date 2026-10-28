export function formatPrice(v) {
    return `R$ ${Number(v).toFixed(2).replace('.', ',')}`;
}

export function formatPriceInput(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
        return '';
    }

    return number.toFixed(2).replace('.', ',');
}

export function parsePrice(value) {
    const raw = String(value ?? '').trim();
    if (!raw) {
        return null;
    }

    const normalized = raw.includes(',')
        ? raw.replace(/\./g, '').replace(',', '.')
        : raw;

    if (!/^\d+(\.\d+)?$/.test(normalized)) {
        return null;
    }

    const number = Number(normalized);
    if (!Number.isFinite(number) || number < 0) {
        return null;
    }

    return number;
}

export function formatTime(iso) {
    return new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo',
    }).format(new Date(iso));
}

export function formatDateTime(iso) {
    const date = new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'America/Sao_Paulo',
    }).format(new Date(iso));

    return `${date} ${formatTime(iso)}`;
}
