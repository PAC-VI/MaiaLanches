export const ORDER_STATUSES = [
    { key: 'novo', label: 'Novo', badgeVariant: 'yellow', actionLabel: 'Iniciar preparo' },
    { key: 'em_preparo', label: 'Em preparo', badgeVariant: 'red', actionLabel: 'Marcar pronto' },
    { key: 'pronto', label: 'Pronto', badgeVariant: 'blue', actionLabel: 'Concluir' },
    { key: 'entregue', label: 'Concluído', badgeVariant: 'green', actionLabel: null },
];

const NEXT_STATUS = {
    novo: 'em_preparo',
    em_preparo: 'pronto',
    pronto: 'entregue',
};

export function nextStatus(status) {
    return NEXT_STATUS[status] ?? null;
}

export function getStatusMeta(status) {
    return ORDER_STATUSES.find((item) => item.key === status) ?? null;
}

export const TYPE_LABELS = {
    delivery: 'Entrega',
    pickup: 'Retirada',
};

export const PAYMENT_LABELS = {
    pix: 'Pix',
    cartao_credito: 'Cartão de crédito',
    cartao_debito: 'Cartão de débito',
    dinheiro: 'Dinheiro',
};
