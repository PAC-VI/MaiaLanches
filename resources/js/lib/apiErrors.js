const FIELD_LABELS = {
    name: 'nome',
    category_id: 'categoria',
    sizes: 'tamanhos',
    size_name: 'nome do tamanho',
    price: 'preço',
    description: 'descrição',
    is_active: 'ativo',
    email: 'e-mail',
    password: 'senha',
    radius_km: 'raio',
    fee_amount: 'taxa',
    status: 'status',
    customer_name: 'nome',
    customer_phone: 'telefone',
    customer_cpf: 'CPF',
    type: 'tipo',
    payment_method: 'pagamento',
    change_for: 'troco',
    delivery_address: 'endereço',
    delivery_zone_id: 'região',
    quantity: 'quantidade',
    product_id: 'produto',
    product_size_id: 'tamanho',
    id: 'tamanho',
    observation: 'observação',
    add_ons: 'acréscimos',
};

function isPortuguese(message) {
    return typeof message === 'string' && /[áàâãéêíóôõúüç]/i.test(message);
}

function fieldLabel(key) {
    const parts = String(key).split('.');
    let segment = parts[parts.length - 1];

    if (/^\d+$/.test(segment) && parts.length > 1) {
        segment = parts[parts.length - 2];
    }

    return FIELD_LABELS[segment] || segment.replaceAll('_', ' ');
}

function firstMessage(messages) {
    if (Array.isArray(messages)) {
        return messages.find((item) => typeof item === 'string') ?? '';
    }

    return typeof messages === 'string' ? messages : '';
}

function translateFieldMessage(key, message) {
    if (isPortuguese(message)) {
        return message;
    }

    if (/already been taken/i.test(message)) {
        return `Este ${fieldLabel(key)} já está em uso.`;
    }

    return `Verifique o campo ${fieldLabel(key)}.`;
}

export function getFieldErrors(err) {
    const errors = err?.errors;

    if (!errors || typeof errors !== 'object' || Array.isArray(errors)) {
        return {};
    }

    const result = {};

    Object.entries(errors).forEach(([key, messages]) => {
        result[key] = translateFieldMessage(key, firstMessage(messages));
    });

    return result;
}

export function translateApiError(err) {
    if (!err || typeof err.status !== 'number') {
        return 'Falha de conexão. Tente de novo.';
    }

    if (err.status === 401) {
        return 'Faça login para continuar.';
    }

    if (err.status === 403) {
        return 'Você não tem permissão para esta ação.';
    }

    if (err.status === 419) {
        return isPortuguese(err.message) ? err.message : 'Sessão expirada. Recarregue a página.';
    }

    if (err.status === 429) {
        return 'Muitas tentativas. Aguarde um minuto e tente de novo.';
    }

    if (err.status >= 500) {
        return 'Erro no servidor. Tente de novo.';
    }

    if (isPortuguese(err.message)) {
        return err.message;
    }

    const firstFieldError = Object.values(getFieldErrors(err))[0];
    if (firstFieldError) {
        return firstFieldError;
    }

    if (err.status === 422) {
        return 'Verifique os dados informados.';
    }

    return 'Não foi possível concluir a ação.';
}
