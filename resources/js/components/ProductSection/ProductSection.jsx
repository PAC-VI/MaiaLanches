import './ProductSection.css';

import ProductCard from '../ProductCard/ProductCard';

import { forwardRef } from 'react';
import { Title } from '../../../styles/globalStyles';

const ProductSection = forwardRef(function ProductSection({ title, products, onAddProduct }, ref) {
    return (
        <div className="productSection" ref={ref} data-category={title}>
            <Title fontSize="1.8rem">{title}</Title>

            <div className="sectionDivider"></div>

            <div className="productList">
                {products.map((product) => (
                    <ProductCard
                        key={product.id}
                        product={product}
                        onAdd={onAddProduct}
                    />
                ))}
            </div>
        </div>
    );
});

export default ProductSection;