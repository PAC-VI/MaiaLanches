import './AlertBanner.css';

import { AlertTriangle } from 'lucide-react';
import { NormalText } from '../../../styles/globalStyles';

export default function AlertBanner({ message }) {
    return (
        <div className="alertBanner">
            <AlertTriangle size={16} color="var(--warning-yellow)" />

            <NormalText fontSize="1.2rem" color="var(--warning-yellow-text)">
                {message}
            </NormalText>
        </div>
    );
}