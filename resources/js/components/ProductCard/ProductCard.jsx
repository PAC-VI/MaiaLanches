import './ProductCard.css';

import ProductModal from '../ProductModal/ProductModal';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Title, NormalText } from '../../../styles/globalStyles';

export default function ProductCard({ product, onAdd }) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <div className="productCard">
                <div className="productInfo">
                    <Title fontSize="1.5rem">{product.name}</Title>
                    <NormalText fontSize="1.3rem">{product.description}</NormalText>
                    <Title fontSize="1.5rem">
                        R$ {product.price.toFixed(2).replace('.', ',')}
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
                onConfirm={onAdd}
            />
        </>
    );
}