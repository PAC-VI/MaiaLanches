import { useState } from 'react';
import './AdminHeader.css';

import { User } from 'lucide-react';
import { NormalText } from '../../../styles/globalStyles';

export default function AdminHeader() {
    const [isStoreOpen, setIsStoreOpen] = useState(false);
    const [deliveryTime, setDeliveryTime] = useState('30 - 45 min');
    const [pickupTime, setPickupTime] = useState('25 min');

    return (
        <header className="adminHeader">
            <div className="adminHeaderStoreStatus">
                <button
                    className={`storeToggleButton ${isStoreOpen ? 'open' : 'closed'}`}
                    onClick={() => setIsStoreOpen((prev) => !prev)}
                >
                    {isStoreOpen ? 'FECHAR LOJA' : 'ABRIR LOJA'}
                </button>

                <NormalText fontSize="1.3rem">
                    Status: {isStoreOpen ? 'Loja aberta' : 'Loja fechada'}
                </NormalText>
            </div>

            <div className="adminHeaderInfo">
                <div className="adminHeaderField">
                    <NormalText fontSize="1.2rem">Entrega</NormalText>
                    <input
                        type="text"
                        value={deliveryTime}
                        onChange={(e) => setDeliveryTime(e.target.value)}
                    />
                </div>

                <div className="adminHeaderField">
                    <NormalText fontSize="1.2rem">Retirada</NormalText>
                    <input
                        type="text"
                        value={pickupTime}
                        onChange={(e) => setPickupTime(e.target.value)}
                    />
                </div>

                <div className="adminHeaderUser">
                    <div className="adminHeaderUserIcon">
                        <User size={16} color="var(--gray)" />
                    </div>
                    <NormalText fontSize="1.3rem" color="var(--black)">Gerente</NormalText>
                </div>
            </div>
        </header>
    );
}