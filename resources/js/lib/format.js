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

    if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
        return null;
    }

    const number = Number(normalized);
    if (!Number.isFinite(number) || number < 0 || number > 9999.99) {
        return null;
    }

    return number;
}

export function formatCountdown(iso) {
    const target = new Date(iso).getTime();

    if (!Number.isFinite(target)) {
        return '00:00';
    }

    const remainingSeconds = Math.max(0, Math.floor((target - Date.now()) / 1000));
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatTime(iso) {
    return new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo',
    }).format(new Date(iso));
}

const WEEKDAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function weekdayLabel(weekday) {
    return WEEKDAY_LABELS[Number(weekday)] ?? '';
}

export function sortStoreHours(days) {
    const order = [1, 2, 3, 4, 5, 6, 0];

    return [...days].sort(
        (a, b) => order.indexOf(Number(a.weekday)) - order.indexOf(Number(b.weekday)),
    );
}

export function formatStoreHours(isOpenDay, opensAt, closesAt) {
    if (!isOpenDay || !opensAt || !closesAt) {
        return 'Fechado';
    }

    return `${String(opensAt).slice(0, 5)} - ${String(closesAt).slice(0, 5)}`;
}

export function crossesMidnight(opensAt, closesAt) {
    if (!opensAt || !closesAt) {
        return false;
    }

    return String(closesAt).slice(0, 5) < String(opensAt).slice(0, 5);
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
