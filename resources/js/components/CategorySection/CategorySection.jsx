import './CategorySection.css';

import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Title, NormalText } from '../../../styles/globalStyles';

import Badge from '../Badge/Badge';
import Toggle from '../Toggle/Toggle';
import ProductRow from '../ProductRow/ProductRow';

export default function CategorySection({ category, onToggleCategory, onToggleProduct, onEditProduct }) {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div className="categorySection">
            <div className="categorySectionHeader">
                <button className="categoryExpandButton" onClick={() => setIsExpanded((prev) => !prev)}>
                    {isExpanded ? <ChevronUp size={18} color="var(--black)" /> : <ChevronDown size={18} color="var(--black)" />}
                    <Title fontSize="1.5rem">{category.name}</Title>
                    <Badge>{category.products.length} itens</Badge>
                </button>

                <div className="categoryStatus">
                    <NormalText fontSize="1.2rem">{category.active ? 'Ativa' : 'Inativa'}</NormalText>
                    <Toggle checked={category.active} onChange={(value) => onToggleCategory(category.id, value)} />
                </div>
            </div>

            {isExpanded && category.products.map((product) => (
                <ProductRow
                    key={product.id}
                    product={product}
                    disabled={!category.active}
                    onToggle={(value) => onToggleProduct(category.id, product.id, value)}
                    onEdit={() => onEditProduct(category.id, product.id)}
                />
            ))}
        </div>
    );
}