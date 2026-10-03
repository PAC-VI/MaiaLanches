// ==========================================================================
// ARQUIVO TEMPORÁRIO DE MOCK
// --------------------------------------------------------------------------
// Simula as formas de pagamento configuráveis no admin (ativo/inativo +
// detalhes de cada uma). Diferente de mocks/establishmentMock.js, que só
// lista os nomes exibidos para o cliente na modal de Pagamentos.
// Remover/substituir assim que a integração com o backend estiver pronta.
// ==========================================================================

export const adminPaymentMethods = [
    { id: 1, name: 'Pix', description: 'Chave: (49) 99999-0000', active: true },
    { id: 2, name: 'Cartão de crédito', description: 'Visa, Master, Elo', active: true },
    { id: 3, name: 'Cartão de débito', description: 'Maquininha na entrega', active: true },
    { id: 4, name: 'Dinheiro', description: 'Troco informado pelo cliente', active: true },
];