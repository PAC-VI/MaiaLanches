import './ProductRow.css';

import { Pencil } from 'lucide-react';
import { Title, NormalText } from '../../../styles/globalStyles';

import Toggle from '../Toggle/Toggle';
import IconButton from '../IconButton/IconButton';

export default function ProductRow({ product, disabled, onToggle, onEdit }) {
    return (
        <div className={`productRow ${disabled ? 'disabled' : ''}`}>
            <div className="productRowInfo">
                <Title fontSize="1.4rem" fontWeight="600">{product.name}</Title>
                <NormalText fontSize="1.3rem">
                    R$ {product.price.toFixed(2).replace('.', ',')}
                </NormalText>
            </div>

            <div className="productRowActions">
                <Toggle checked={product.active} disabled={disabled} onChange={onToggle} />
                <IconButton icon={<Pencil size={16} color="var(--gray)" />} onClick={onEdit} title="Editar produto" />
            </div>
        </div>
    );
}