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

export function filterAddress(value) {
    return String(value ?? '')
        .replace(/<[^>]*>/g, '')
        .replace(/[^\p{L}\p{M}\p{N}\s,.'º°/-]/gu, '')
        .slice(0, 180);
}

export function filterNote(value) {
    return String(value ?? '')
        .replace(/<[^>]*>/g, '')
        .replace(/[^\p{L}\p{M}\p{N}\s,.'º°/!?()-]/gu, '')
        .slice(0, 180);
}

export function hasUnsafeText(value) {
    return /<|>|javascript\s*:|on\w+\s*=|(\b(select|union|insert|update|delete|drop|alter)\b[\s\S]{0,24}\b(from|into|table|database)\b)|--|\/\*|\*\//i
        .test(String(value ?? ''));
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
