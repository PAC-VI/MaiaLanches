import './ProductCard.css';

import ProductModal from '../ProductModal/ProductModal';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Title, NormalText } from '../../../styles/globalStyles';

function formatPrice(value) {
    return `R$ ${Number(value).toFixed(2).replace('.', ',')}`;
}

export default function ProductCard({ product, addOns, onAdd }) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const sizes = product.sizes ?? [];
    const cheapestPrice = sizes.length > 0
        ? Math.min(...sizes.map((size) => size.price))
        : 0;

    return (
        <>
            <div className="productCard">
                <div className="productInfo">
                    <Title fontSize="1.5rem">{product.name}</Title>
                    <NormalText fontSize="1.3rem">{product.description}</NormalText>
                    <Title fontSize="1.5rem">
                        {sizes.length > 1 ? `A partir de ${formatPrice(cheapestPrice)}` : formatPrice(cheapestPrice)}
                    </Title>
                </div>

                <button className="addButton" onClick={() => setIsModalOpen(true)}>
                    <Plus size={20} color="var(--white)" />
                </button>
            </div>

            <ProductModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                product={product}
                addOns={addOns}
                onConfirm={onAdd}
            />
        </>
    );
}
