// ==========================================================================
// ARQUIVO TEMPORÁRIO DE MOCK
// --------------------------------------------------------------------------
// Simula os dados de categorias/produtos que virão do backend para a tela
// de administração do cardápio (toggle de ativo/inativo por categoria e
// por produto). Remover/substituir assim que a integração com o backend
// estiver pronta.
// ==========================================================================

export const adminCategories = [
    {
        id: 1,
        name: 'Lanches',
        active: true,
        products: [
            { id: 1, name: 'Maia Clássico', price: 32.9, active: true },
            { id: 2, name: 'Bacon Supremo', price: 35.9, active: true },
            { id: 3, name: 'Duplo Maia', price: 39.9, active: false },
        ],
    },
    {
        id: 2,
        name: 'Dogão Prensado',
        active: true,
        products: [
            { id: 4, name: 'Dogão Simples', price: 18.9, active: true },
            { id: 5, name: 'Dogão Especial', price: 24.9, active: true },
        ],
    },
    {
        id: 3,
        name: 'Porções',
        active: true,
        products: [
            { id: 6, name: 'Batata Frita 200g', price: 18.9, active: true },
            { id: 7, name: 'Batata com Cheddar e Bacon', price: 26.9, active: true },
        ],
    },
    {
        id: 4,
        name: 'Bebidas',
        active: false,
        products: [
            { id: 8, name: 'Refrigerante Lata 350ml', price: 7.5, active: true },
            { id: 9, name: 'Suco Natural 500ml', price: 12.9, active: true },
        ],
    },
];