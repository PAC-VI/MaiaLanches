import './CategorySection.css';

import { useState } from 'react';
import { ArrowDown, ArrowUp, ChevronUp, ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { Title, NormalText } from '../../../styles/globalStyles';

import Badge from '../Badge/Badge';
import Toggle from '../Toggle/Toggle';
import IconButton from '../IconButton/IconButton';
import ProductRow from '../ProductRow/ProductRow';

export default function CategorySection({
    category,
    isFirst = false,
    isLast = false,
    reordering = false,
    pendingProductId,
    categoryPending,
    onToggleCategory,
    onToggleProduct,
    onMoveCategory,
    onMoveProduct,
    onEditCategory,
    onDeleteCategory,
    onEditProduct,
    onDeleteProduct,
}) {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div className="categorySection">
            <div className="categorySectionHeader">
                <button className="categoryExpandButton" onClick={() => setIsExpanded((prev) => !prev)}>
                    {isExpanded ? <ChevronUp size={18} color="var(--black)" /> : <ChevronDown size={18} color="var(--black)" />}
                    <Title fontSize="1.5rem">{category.name}</Title>
                    <Badge>{category.products.length} itens</Badge>
                </button>

                <div className="categorySectionTools">
                    <div className="categoryActions">
                        <IconButton
                            icon={<ArrowUp size={16} color="var(--gray)" />}
                            onClick={() => onMoveCategory(category.id, -1)}
                            disabled={reordering || isFirst}
                            title={`Mover ${category.name} para cima`}
                        />
                        <IconButton
                            icon={<ArrowDown size={16} color="var(--gray)" />}
                            onClick={() => onMoveCategory(category.id, 1)}
                            disabled={reordering || isLast}
                            title={`Mover ${category.name} para baixo`}
                        />
                        <IconButton
                            icon={<Pencil size={16} color="var(--gray)" />}
                            onClick={() => onEditCategory(category.id)}
                            title="Editar"
                        />
                        <IconButton
                            icon={<Trash2 size={16} color="var(--gray)" />}
                            onClick={() => onDeleteCategory(category.id)}
                            variant="danger"
                            disabled={categoryPending || !category.canDelete}
                            title={category.canDelete ? 'Excluir' : 'Já teve vendas: apenas desative'}
                        />
                    </div>

                    <div className="categoryStatus">
                        <NormalText fontSize="1.2rem">{category.active ? 'Ativa' : 'Inativa'}</NormalText>
                        <Toggle
                            checked={category.active}
                            disabled={categoryPending}
                            onChange={(value) => onToggleCategory(category.id, value)}
                        />
                    </div>
                </div>
            </div>

            {isExpanded && category.products.map((product, index) => (
                <ProductRow
                    key={product.id}
                    product={product}
                    pending={categoryPending || pendingProductId === product.id}
                    moveUpDisabled={reordering || index === 0}
                    moveDownDisabled={reordering || index === category.products.length - 1}
                    onMoveUp={() => onMoveProduct(category.id, product.id, -1)}
                    onMoveDown={() => onMoveProduct(category.id, product.id, 1)}
                    onToggle={(value) => onToggleProduct(category.id, product.id, value)}
                    onEdit={() => onEditProduct(category.id, product.id)}
                    onDelete={() => onDeleteProduct(category.id, product.id)}
                />
            ))}
        </div>
    );
}
