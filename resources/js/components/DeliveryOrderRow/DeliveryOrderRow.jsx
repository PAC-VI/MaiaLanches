import './DeliveryOrderRow.css';

import { Title, NormalText } from '../../../styles/globalStyles';

import Badge from '../Badge/Badge';

export default function DeliveryOrderRow({ orderId, client, location, fee, statusLabel, badgeVariant }) {
    return (
        <div className="deliveryOrderRow">
            <div className="deliveryOrderInfo">
                <Title fontSize="1.4rem" fontWeight="600">
                    #{orderId} · {client}
                </Title>
                <NormalText fontSize="1.2rem">
                    {location} · Taxa R$ {fee.toFixed(2).replace('.', ',')}
                </NormalText>
            </div>

            <Badge variant={badgeVariant}>{statusLabel}</Badge>
        </div>
    );
}