import './ProductRow.css';

import { Pencil } from 'lucide-react';
import { Title, NormalText } from '../../../styles/globalStyles';
import { formatPrice } from '../../lib/format';

import Toggle from '../Toggle/Toggle';
import IconButton from '../IconButton/IconButton';

export default function ProductRow({ product, pending, onToggle, onEdit }) {
    const sizeCount = product.raw?.sizes?.length ?? 0;
    const priceLabel = sizeCount > 1
        ? `a partir de ${formatPrice(product.price)}`
        : formatPrice(product.price);

    return (
        <div className="productRow">
            <div className="productRowInfo">
                <Title fontSize="1.4rem" fontWeight="600">{product.name}</Title>
                <NormalText fontSize="1.3rem">{priceLabel}</NormalText>
            </div>

            <div className="productRowActions">
                <Toggle checked={product.active} disabled={pending} onChange={onToggle} />
                <IconButton icon={<Pencil size={16} color="var(--gray)" />} onClick={onEdit} title="Editar produto" />
            </div>
        </div>
    );
}
