// ==========================================================================
// ARQUIVO TEMPORÁRIO DE MOCK
// --------------------------------------------------------------------------
// Simula os números agregados exibidos em Relatórios. Futuramente virá de
// endpoints de agregação no backend (Laravel + banco de dados).
// Remover/substituir assim que a integração com o backend estiver pronta.
// ==========================================================================

export const reportsHero = {
    label: 'Faturamento dos últimos 30 dias',
    value: 'R$ 48.320,90',
    trendText: '+12,4% vs 30 dias anteriores',
    note: 'Período de 30 dias encerrado hoje',
    stats: [
        { label: 'Média por dia', value: 'R$ 1.610,70' },
        { label: 'Melhor dia', value: 'R$ 2.960,00', helper: 'Sábado' },
        { label: 'Projeção do período', value: 'R$ 51.400,00' },
    ],
};

export const reportSections = [
    {
        title: 'Financeiro',
        description: 'Receita, ticket médio e valores recebidos',
        metrics: [
            { label: 'Faturamento hoje', value: 'R$ 1.428,60', trend: { direction: 'up', text: '+8,3% vs ontem' } },
            { label: 'Faturamento 7 dias', value: 'R$ 11.740,50', trend: { direction: 'down', text: '-3,2% vs semana anterior' } },
            { label: 'Faturamento 30 dias', value: 'R$ 48.320,90', trend: { direction: 'up', text: '+12,4% vs período anterior' } },
            { label: 'Ticket médio', value: 'R$ 37,63', trend: { direction: 'up', text: '+R$ 1,20' } },
            { label: 'Recebido via PIX', value: 'R$ 22.410,20', helperText: '46,4% do faturamento' },
            { label: 'Recebido em cartão de crédito', value: 'R$ 17.395,50', helperText: '36,0% do faturamento' },
            { label: 'Recebido em dinheiro', value: 'R$ 5.850,00', helperText: '12,1% do faturamento' },
            { label: 'Recebido em cartão de débito', value: 'R$ 2.665,20', helperText: '5,5% do faturamento' },
            { label: 'Taxas de entrega arrecadadas', value: 'R$ 4.664,00', helperText: '1.166 entregas no período' },
            { label: 'A repassar motoboys', value: 'R$ 3.498,00', helperText: '353 rotas no período' },
        ],
    },
    {
        title: 'Pedidos',
        description: 'Volume, andamento e tempo de operação',
        metrics: [
            { label: 'Pedidos 30 dias', value: '1.284', trend: { direction: 'up', text: '+8,1% vs período anterior' } },
            { label: 'Pedidos 7 dias', value: '312', helperText: 'média de 45 pedidos por dia' },
            { label: 'Em andamento agora', value: '6', helperText: '2 aguardando aprovação' },
            { label: 'Concluídos', value: '1.196', helperText: '93,1% dos pedidos do período' },
            { label: 'Cancelados', value: '22', helperText: '1,7% dos pedidos do período' },
            { label: 'Entrega x Retirada', value: '89% x 11%', helperText: '1.166 entregas · 118 retiradas' },
            { label: 'Tempo médio de preparo', value: '14 min', trend: { direction: 'up', text: '-2 min' } },
            { label: 'Tempo médio de entrega', value: '38 min', trend: { direction: 'down', text: '+3 min' } },
        ],
    },
    {
        title: 'Clientes',
        description: 'Base, novos cadastros e recorrência',
        metrics: [
            { label: 'Novos clientes', value: '196', trend: { direction: 'up', text: '+22 vs período anterior' } },
            { label: 'Clientes recorrentes', value: '742', helperText: '57,8% da base' },
            { label: 'Clientes ativos 30 dias', value: '908', helperText: 'média de 1,4 pedidos cada' },
            { label: 'Base total de clientes', value: '2.148', helperText: 'cadastros no sistema' },
            { label: 'Ticket médio recorrente', value: 'R$ 40,80', helperText: 'novos clientes pagam R$ 33,10' },
        ],
    },
    {
        title: 'Cardápio',
        description: 'Itens, categorias e complementos mais vendidos',
        metrics: [
            { label: 'Itens vendidos', value: '3.418', trend: { direction: 'up', text: '+150 itens vs período anterior' } },
            { label: 'Produto mais vendido', value: 'Maia Clássico', helperText: '412 unidades no período' },
            { label: 'Categoria líder', value: 'Lanches', helperText: '41% do faturamento' },
            { label: 'Complementos vendidos', value: '612', helperText: 'R$ 2.148,00 em adicionais' },
            { label: 'Produtos pausados', value: '1', helperText: 'Duplo Maia fora do ar' },
        ],
    },
];