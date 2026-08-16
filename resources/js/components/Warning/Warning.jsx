import './Warning.css';

import { Title } from '../../../styles/globalStyles';
import { Clock } from 'lucide-react';

export default function Warning({ isOpen }) {
    const mainColor = isOpen ? 'var(--warning-green)' : 'var(--main-red)';
    const labelText = isOpen ? 'Estabelecimento: ABERTO' : 'Estabelecimento: FECHADO';
    
    const bgClass = isOpen ? 'warning-bg-open' : 'warning-bg-closed';

    return (
        <div className={`warningCard ${bgClass}`}>
            <div className="warningIcon">
                <Clock size={16} color={mainColor} />
            </div>

            <Title fontSize="1.2rem" fontWeight="bold" style={{ color: mainColor }}>
                {labelText}
            </Title>
        </div>
    )
}