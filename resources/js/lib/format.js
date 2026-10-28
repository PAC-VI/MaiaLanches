export function formatPrice(v) {
    return `R$ ${Number(v).toFixed(2).replace('.', ',')}`;
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
