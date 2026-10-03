import './StatCard.css';

import { Title, NormalText } from '../../../styles/globalStyles';

export default function StatCard({ label, value, variant = 'subtle' }) {
    return (
        <div className={`statCard statCard-${variant}`}>
            <NormalText fontSize="1.1rem" fontWeight="700" className="statCardLabel">
                {label}
            </NormalText>
            <Title fontSize="1.8rem">{value}</Title>
        </div>
    );
}