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
