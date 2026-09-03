// ==========================================================================
// ARQUIVO TEMPORÁRIO DE MOCK
// --------------------------------------------------------------------------
// Dados institucionais do estabelecimento (formas de pagamento, horários de
// funcionamento e informações gerais). Simula o que futuramente virá do
// backend. Remover assim que a integração com o backend estiver pronta.
// ==========================================================================

export const paymentMethods = [
    'PIX',
    'Dinheiro',
    'Cartão de crédito',
    'Cartão de débito',
    'Vale-refeição',
];

export const openingHours = [
    { day: 'Segunda', hours: 'Fechado' },
    { day: 'Terça a Quinta', hours: '18:00 - 23:00' },
    { day: 'Sexta e Sábado', hours: '18:00 - 00:00' },
    { day: 'Domingo', hours: '18:00 - 23:00' },
];

export const establishmentInfo = {
    description: 'Maia Lanches — lanches artesanais preparados na hora, com entrega e retirada no balcão.',
    address: 'Rua Faustino Busarello, 792',
    delivery: '30min - 45min · Retirada em 25min',
    contact: '(49) 99999-0000',
};