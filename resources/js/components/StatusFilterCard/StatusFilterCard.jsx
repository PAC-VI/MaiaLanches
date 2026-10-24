import './StatusFilterCard.css';
import { Title } from '../../../styles/globalStyles';
import Badge from '../Badge/Badge';

export default function StatusFilterCard({ label, count, badgeVariant, isActive, onClick }) {
    return (
        <button className={`statusFilterCard ${isActive ? 'active' : ''}`} onClick={onClick}>
            <Badge variant={badgeVariant}>
                {count} {count === 1 ? 'PEDIDO' : 'PEDIDOS'}
            </Badge>
            <Title fontSize="1.4rem">{label}</Title>
        </button>
    );
}