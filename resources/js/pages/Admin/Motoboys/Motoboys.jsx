import './Motoboys.css';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Title, NormalText } from '../../../../styles/globalStyles';
import { mockMotoboys } from '../../../mocks/motoboysMock';

import AdminLayout from '../../../layouts/AdminLayout/AdminLayout';
import AdminPageHeader from '../../../components/AdminPageHeader/AdminPageHeader';
import AdminCard from '../../../components/AdminCard/AdminCard';
import SectionLabel from '../../../components/SectionLabel/SectionLabel';
import Button from '../../../components/Button/Button';
import MotoboyListItem from '../../../components/MotoboyListItem/MotoboyListItem';
import StatCard from '../../../components/StatCard/StatCard';
import DeliveryOrderRow from '../../../components/DeliveryOrderRow/DeliveryOrderRow';
import Badge from '../../../components/Badge/Badge';

export default function Motoboys() {
    const [selectedId, setSelectedId] = useState(mockMotoboys[0].id);

    const selectedMotoboy = mockMotoboys.find((motoboy) => motoboy.id === selectedId);

    const handleNewMotoboy = () => {
        console.log('Novo motoboy');
    };

    return (
        <AdminLayout>
            <div className="motoboysApp">
                <AdminPageHeader
                    title="Motoboys"
                    subtitle="Entregadores cadastrados e desempenho do dia."
                >
                    <Button variant="solid-success" icon={<Plus size={16} />} onClick={handleNewMotoboy}>
                        Novo motoboy
                    </Button>
                </AdminPageHeader>

                <div className="motoboysGrid">
                    <AdminCard>
                        <SectionLabel>Entregadores</SectionLabel>

                        <div className="motoboysList">
                            {mockMotoboys.map((motoboy) => (
                                <MotoboyListItem
                                    key={motoboy.id}
                                    name={motoboy.name.toUpperCase()}
                                    phone={motoboy.phone}
                                    statusLabel={motoboy.status === 'ativo' ? 'Ativo' : 'Off'}
                                    badgeVariant={motoboy.status === 'ativo' ? 'green' : 'neutral'}
                                    isActive={motoboy.id === selectedId}
                                    onClick={() => setSelectedId(motoboy.id)}
                                />
                            ))}
                        </div>
                    </AdminCard>

                    <div className="motoboysDetails">
                        <AdminCard>
                            <div className="motoboyDetailHeader">
                                <div className="motoboyDetailHeaderText">
                                    <Title fontSize="1.8rem">{selectedMotoboy.name.toUpperCase()}</Title>
                                    <NormalText fontSize="1.3rem">{selectedMotoboy.phone}</NormalText>
                                </div>

                                <Badge variant={selectedMotoboy.status === 'ativo' ? 'green' : 'neutral'}>
                                    {selectedMotoboy.currentStatusLabel}
                                </Badge>
                            </div>

                            <div className="motoboyStats">
                                <StatCard label="Entregas hoje" value={selectedMotoboy.stats.deliveriesToday} />
                                <StatCard
                                    label="Repasse acumulado"
                                    value={`R$ ${selectedMotoboy.stats.payoutAccumulated.toFixed(2).replace('.', ',')}`}
                                />
                                <StatCard
                                    label="Média por entrega"
                                    value={`R$ ${selectedMotoboy.stats.avgPerDelivery.toFixed(2).replace('.', ',')}`}
                                />
                            </div>
                        </AdminCard>

                        <AdminCard>
                            <SectionLabel>Pedidos do entregador</SectionLabel>

                            {selectedMotoboy.orders.map((order) => (
                                <DeliveryOrderRow
                                    key={order.id}
                                    orderId={order.id}
                                    client={order.client}
                                    location={order.location}
                                    fee={order.fee}
                                    statusLabel={order.status === 'entregue' ? 'Entregue' : 'Em rota'}
                                    badgeVariant={order.status === 'entregue' ? 'green' : 'yellow'}
                                />
                            ))}

                            {selectedMotoboy.orders.length === 0 && (
                                <NormalText fontSize="1.3rem" className="motoboyNoOrders">
                                    Nenhum pedido no momento.
                                </NormalText>
                            )}
                        </AdminCard>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}