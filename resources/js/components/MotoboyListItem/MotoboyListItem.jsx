import './MotoboyListItem.css';

import { Title, NormalText } from '../../../styles/globalStyles';

import Badge from '../Badge/Badge';

export default function MotoboyListItem({ name, phone, statusLabel, badgeVariant, isActive, onClick }) {
    return (
        <button className={`motoboyListItem ${isActive ? 'active' : ''}`} onClick={onClick}>
            <div className="motoboyListItemInfo">
                <Title fontSize="1.4rem">{name}</Title>
                <NormalText fontSize="1.2rem">{phone}</NormalText>
            </div>

            <Badge variant={badgeVariant}>{statusLabel}</Badge>
        </button>
    );
}