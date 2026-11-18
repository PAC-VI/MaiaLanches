import './ProductRow.css';

import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react';
import { Title, NormalText } from '../../../styles/globalStyles';
import { formatPrice } from '../../lib/format';

import Toggle from '../Toggle/Toggle';
import IconButton from '../IconButton/IconButton';

export default function ProductRow({
    product,
    pending,
    moveUpDisabled = false,
    moveDownDisabled = false,
    onMoveUp,
    onMoveDown,
    onToggle,
    onEdit,
    onDelete,
}) {
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
                <IconButton
                    icon={<ArrowUp size={16} color="var(--gray)" />}
                    onClick={onMoveUp}
                    disabled={moveUpDisabled}
                    title={`Mover ${product.name} para cima`}
                />
                <IconButton
                    icon={<ArrowDown size={16} color="var(--gray)" />}
                    onClick={onMoveDown}
                    disabled={moveDownDisabled}
                    title={`Mover ${product.name} para baixo`}
                />
                <Toggle checked={product.active} disabled={pending} onChange={onToggle} />
                <IconButton icon={<Pencil size={16} color="var(--gray)" />} onClick={onEdit} title="Editar produto" />
                <IconButton
                    icon={<Trash2 size={16} color="var(--gray)" />}
                    onClick={onDelete}
                    variant="danger"
                    disabled={pending || !product.canDelete}
                    title={product.canDelete ? 'Excluir' : 'Já teve vendas: apenas desative'}
                />
            </div>
        </div>
    );
}
