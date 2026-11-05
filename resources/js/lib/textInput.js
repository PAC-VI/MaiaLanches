export function filterPersonName(value) {
    return String(value ?? '')
        .replace(/<[^>]*>/g, '')
        .replace(/[^\p{L}\p{M}\s'.-]/gu, '')
        .slice(0, 80);
}

export function isPersonName(value) {
    const name = String(value ?? '').trim();
    const letters = name.match(/\p{L}/gu) || [];

    if (letters.length < 2 || name.length > 80) {
        return false;
    }

    return /^[\p{L}\p{M}][\p{L}\p{M}\s'.-]*$/u.test(name);
}

const SAFE_TEXT = /[^\p{L}\p{M}0-9 .,'’&()/%+:;!?\-_ºª°]/gu;

function filterSafeText(value, maxLength) {
    return String(value ?? '')
        .replace(/[<>]/g, '')
        .replace(SAFE_TEXT, '')
        .slice(0, maxLength);
}

export function filterStreet(value) {
    return filterSafeText(value, 80);
}

export function filterHouseNumber(value) {
    const raw = String(value ?? '').toUpperCase().replace(/[^0-9A-Z/]/g, '').slice(0, 10);

    if (raw === 'S' || raw.startsWith('S/')) {
        if (raw === 'S' || raw === 'S/' || raw === 'S/N') {
            return raw;
        }

        return raw.startsWith('S/N') ? 'S/N' : 'S/';
    }

    const digits = raw.match(/^\d*/)?.[0] ?? '';
    const letter = raw.slice(digits.length).match(/[A-Z]/)?.[0] ?? '';

    return `${digits}${letter}`.slice(0, 10);
}

export function isHouseNumber(value) {
    return /^(S\/N|\d+[A-Z]?)$/.test(String(value ?? '').trim().toUpperCase());
}

export function filterNeighborhood(value) {
    return filterSafeText(value, 60);
}

export function filterReference(value) {
    return filterSafeText(value, 80);
}

export function filterNote(value) {
    return String(value ?? '')
        .replace(/<[^>]*>/g, '')
        .replace(/[^\p{L}\p{M}\p{N}\s,.'º°/!?()-]/gu, '')
        .slice(0, 180);
}

export function maskPhone(value) {
    const digits = String(value ?? '').replace(/\D/g, '').slice(0, 11);

    if (digits.length === 0) {
        return '';
    }

    if (digits.length <= 2) {
        return `(${digits}`;
    }

    const ddd = digits.slice(0, 2);
    const rest = digits.slice(2);

    if (digits.length <= 6) {
        return `(${ddd}) ${rest}`;
    }

    if (digits.length <= 10) {
        return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
    }

    return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
}

export function isPhoneNumber(value) {
    const digits = String(value ?? '').replace(/\D/g, '');

    if (digits.length !== 10 && digits.length !== 11) {
        return false;
    }

    const ddd = Number(digits.slice(0, 2));

    if (ddd < 11 || ddd > 99) {
        return false;
    }

    if (digits.length === 11 && digits[2] !== '9') {
        return false;
    }

    return true;
}
