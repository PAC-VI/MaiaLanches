import './Produtos.css';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { NormalText } from '../../../../styles/globalStyles';
import { adminCategories } from '../../../mocks/adminProductsMock';

import AdminLayout from '../../../layouts/AdminLayout/AdminLayout';
import AdminPageHeader from '../../../components/AdminPageHeader/AdminPageHeader';
import AdminCard from '../../../components/AdminCard/AdminCard';
import Button from '../../../components/Button/Button';
import CategorySection from '../../../components/CategorySection/CategorySection';

export default function Produtos() {
    const [categories, setCategories] = useState(adminCategories);

    const handleToggleCategory = (categoryId, value) => {
        setCategories((prev) =>
            prev.map((category) =>
                category.id === categoryId ? { ...category, active: value } : category
            )
        );
    };

    const handleToggleProduct = (categoryId, productId, value) => {
        setCategories((prev) =>
            prev.map((category) => {
                if (category.id !== categoryId) return category;

                return {
                    ...category,
                    products: category.products.map((product) =>
                        product.id === productId ? { ...product, active: value } : product
                    ),
                };
            })
        );
    };

    const handleEditProduct = (categoryId, productId) => {
        console.log('Editar produto', { categoryId, productId });
    };

    const handleNewCategory = () => {
        console.log('Nova categoria');
    };

    const handleNewItem = () => {
        console.log('Novo item');
    };

    return (
        <AdminLayout>
            <div className="produtosApp">
                <AdminPageHeader
                    title="Produtos"
                    subtitle="Organize o cardápio e as receitas por categorias expansíveis."
                >
                    <Button variant="outline-success" icon={<Plus size={16} />} onClick={handleNewCategory}>
                        Nova Categoria
                    </Button>

                    <Button variant="solid-success" icon={<Plus size={16} />} onClick={handleNewItem}>
                        Novo Item
                    </Button>
                </AdminPageHeader>

                <AdminCard>
                    {categories.map((category) => (
                        <CategorySection
                            key={category.id}
                            category={category}
                            onToggleCategory={handleToggleCategory}
                            onToggleProduct={handleToggleProduct}
                            onEditProduct={handleEditProduct}
                        />
                    ))}
                </AdminCard>

                <NormalText fontSize="1.3rem" className="produtosHint">
                    Dica: desative uma categoria inteira para pausar todos os itens durante o expediente.
                    Os ingredientes de cada receita são editados dentro do próprio produto.
                </NormalText>
            </div>
        </AdminLayout>
    );
}