function isPortuguese(message) {
    return typeof message === 'string' && /[áàâãéêíóôõúüç]/i.test(message);
}

function firstMessage(messages) {
    if (Array.isArray(messages)) {
        return messages.find((item) => typeof item === 'string') ?? '';
    }

    return typeof messages === 'string' ? messages : '';
}

export function getFieldErrors(err) {
    const errors = err?.errors;

    if (!errors || typeof errors !== 'object' || Array.isArray(errors)) {
        return {};
    }

    const result = {};

    Object.entries(errors).forEach(([key, messages]) => {
        const message = firstMessage(messages);

        if (message) {
            result[key] = message;
        }
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
