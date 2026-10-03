// ==========================================================================
// ARQUIVO TEMPORÁRIO DE MOCK
// --------------------------------------------------------------------------
// Simula os padrões de horário de funcionamento cadastrados. O campo
// "active" indica qual padrão está em vigor; "isOpenNow" é calculado no
// backend a partir do horário atual e das faixas do padrão.
// Remover/substituir assim que a integração com o backend estiver pronta.
// ==========================================================================

export const mockSchedules = [
    { id: 1, name: 'Padrão Semana', hours: 'Ter a Qui · 18:00 - 23:00', active: true, isOpenNow: false },
    { id: 2, name: 'Padrão Fim de Semana', hours: 'Sex e Sáb · 18:00 - 00:00', active: false, isOpenNow: true },
    { id: 3, name: 'Padrão Feriado', hours: '19:00 - 23:00', active: false, isOpenNow: false },
];