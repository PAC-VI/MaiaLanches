import './StoreHeader.css';

import { MapPin } from 'lucide-react';
import { Title, NormalText } from '../../../styles/globalStyles';

export default function StoreHeader() {
    return (
        <>
            <div className="banner"></div>

            <div className="icon">
                <img src="/images/main-maia.png" alt="Logo Maia Lanches" className="logoImage" />
            </div>

            <div className="maiaTitle">
                <Title>Maia Lanches</Title>
                <div className="loc">
                    <MapPin size={16} color="var(--main-red)" />
                    <NormalText>Rua Faustino Busarello, 792</NormalText>
                </div>
            </div>
        </>
    );
}
