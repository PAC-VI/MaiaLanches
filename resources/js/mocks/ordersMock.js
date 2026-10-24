// ==========================================================================
// ARQUIVO TEMPORÁRIO DE MOCK
// --------------------------------------------------------------------------
// Simula os pedidos que futuramente virão do backend (Laravel + banco de
// dados + provavelmente um canal realtime para status). Os 8 pedidos
// "ativos" batem com o print do protótipo; os 2 extras com status
// "concluido" servem para testar o toggle "Exibir concluídos".
// Remover/substituir assim que a integração com o backend estiver pronta.
// ==========================================================================

export const mockOrders = [
    { id: 1042, client: 'Ana Beatriz', items: '1x Maia Clássico, 1x Coca lata', type: 'Entrega', payment: 'PIX', time: '20:12', total: 40.4, status: 'aguardando_aprovacao' },
    { id: 1041, client: 'Carlos Mendes', items: '2x Bacon Supremo', type: 'Entrega', payment: 'Cartão de crédito', time: '20:05', total: 71.8, status: 'aguardando_aprovacao' },
    { id: 1040, client: 'Juliana Rocha', items: '1x Combo Casal', type: 'Entrega', payment: 'Dinheiro', time: '19:58', total: 84.9, status: 'atualizado' },
    { id: 1039, client: 'Pedro Alves', items: '1x Duplo Maia, 1x Batata 200g', type: 'Retirada', payment: 'PIX', time: '19:50', total: 58.8, status: 'em_preparacao' },
    { id: 1038, client: 'Marina Souza', items: '1x Frango Crispy', type: 'Entrega', payment: 'Vale-refeição', time: '19:44', total: 29.9, status: 'em_preparacao' },
    { id: 1037, client: 'Rafael Lima', items: '1x Combo Bacon, 1x Milkshake', type: 'Entrega', payment: 'PIX', time: '19:30', total: 74.8, status: 'saiu_para_entrega' },
    { id: 1036, client: 'Bruna Castro', items: '1x Nuggets, 1x Suco', type: 'Retirada', payment: 'Cartão de débito', time: '19:22', total: 35.8, status: 'pronto_retirada' },
    { id: 1035, client: 'Tiago Ferraz', items: '3x Combo Clássico', type: 'Entrega', payment: 'PIX', time: '22:00 (hoje)', total: 134.7, status: 'agendado' },
    { id: 1030, client: 'Lucas Pereira', items: '1x Milkshake 400ml', type: 'Retirada', payment: 'PIX', time: '18:50', total: 21.9, status: 'concluido' },
    { id: 1028, client: 'Fernanda Lima', items: '2x Nuggets 12un', type: 'Entrega', payment: 'Dinheiro', time: '18:30', total: 45.8, status: 'concluido' },
];

// Configuração dos cards de status: ordem de exibição e cor do badge de contagem.
// 'concluido' fica de fora por padrão — só aparece quando o toggle de
// "exibir concluídos" está ativo (ver Pedidos.jsx).
export const orderStatusConfig = [
    { key: 'aguardando_aprovacao', label: 'Aguardando Aprovação', badgeVariant: 'yellow' },
    { key: 'atualizado', label: 'Atualizado', badgeVariant: 'neutral' },
    { key: 'em_preparacao', label: 'Em Preparação', badgeVariant: 'red' },
    { key: 'saiu_para_entrega', label: 'Saiu para Entrega', badgeVariant: 'blue' },
    { key: 'pronto_retirada', label: 'Pronto para Retirada', badgeVariant: 'green' },
    { key: 'agendado', label: 'Agendado', badgeVariant: 'neutral' },
    { key: 'concluido', label: 'Concluído', badgeVariant: 'green' },
];