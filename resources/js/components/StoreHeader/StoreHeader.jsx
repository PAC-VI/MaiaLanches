import './StoreHeader.css';

import { MapPin } from 'lucide-react';
import { Title, NormalText } from '../../../styles/globalStyles';

export default function StoreHeader({ name = '', address = '' }) {
    const storeName = String(name || '').trim();
    const storeAddress = String(address || '').trim();

    return (
        <>
            <div className="banner"></div>

            <div className="icon">
                <img
                    src="/images/main-maia.png"
                    alt={storeName ? `Logo ${storeName}` : 'Logo da loja'}
                    className="logoImage"
                />
            </div>

            <div className="maiaTitle">
                {storeName ? <Title>{storeName}</Title> : null}
                {storeAddress ? (
                    <div className="loc">
                        <MapPin size={16} color="var(--main-red)" />
                        <NormalText>{storeAddress}</NormalText>
                    </div>
                ) : null}
            </div>
        </>
    );
}
