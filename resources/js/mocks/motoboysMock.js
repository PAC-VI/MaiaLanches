// ==========================================================================
// ARQUIVO TEMPORÁRIO DE MOCK
// --------------------------------------------------------------------------
// Simula os motoboys cadastrados, seu status de serviço e os pedidos sob
// responsabilidade de cada um. Futuramente virá do backend (Laravel +
// banco de dados), provavelmente com status atualizado em tempo real.
// Remover/substituir assim que a integração com o backend estiver pronta.
// ==========================================================================

export const mockMotoboys = [
    {
        id: 1,
        name: 'Paulo',
        phone: '(49) 99811-2233',
        status: 'ativo',
        currentStatusLabel: 'Em serviço',
        stats: { deliveriesToday: 18, payoutAccumulated: 142.0, avgPerDelivery: 7.89 },
        orders: [
            { id: 1037, client: 'Rafael Lima', location: 'Centro', fee: 8.0, status: 'entregue' },
            { id: 1031, client: 'Sônia Prado', location: 'São Cristóvão', fee: 12.0, status: 'entregue' },
            { id: 1029, client: 'Igor Batista', location: 'Jardim América', fee: 5.0, status: 'em_rota' },
        ],
    },
    {
        id: 2,
        name: 'Ricardo',
        phone: '(49) 99744-1180',
        status: 'ativo',
        currentStatusLabel: 'Em serviço',
        stats: { deliveriesToday: 11, payoutAccumulated: 96.0, avgPerDelivery: 8.73 },
        orders: [
            { id: 1040, client: 'Juliana Rocha', location: 'Bairro Industrial', fee: 9.0, status: 'em_rota' },
            { id: 1033, client: 'Henrique Dias', location: 'Centro', fee: 5.0, status: 'entregue' },
        ],
    },
    {
        id: 3,
        name: 'Jefferson',
        phone: '(49) 99655-0021',
        status: 'off',
        currentStatusLabel: 'Fora de serviço',
        stats: { deliveriesToday: 0, payoutAccumulated: 0, avgPerDelivery: 0 },
        orders: [],
    },
];