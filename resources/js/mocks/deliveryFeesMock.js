// ==========================================================================
// ARQUIVO TEMPORÁRIO DE MOCK
// --------------------------------------------------------------------------
// Simula as faixas de distância e taxas de entrega cadastradas. Futuramente
// virá do backend (Laravel + banco de dados).
// Remover/substituir assim que a integração com o backend estiver pronta.
// ==========================================================================

export const mockDeliveryFees = [
    { id: 1, from: 0, to: 2, fee: 5.0, motoboyPayout: 4.0 },
    { id: 2, from: 2, to: 4, fee: 8.0, motoboyPayout: 6.0 },
    { id: 3, from: 4, to: 7, fee: 12.0, motoboyPayout: 9.0 },
    { id: 4, from: 7, to: 10, fee: 16.0, motoboyPayout: 12.0 },
];