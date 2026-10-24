import './TaxasDeEntrega.css';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { NormalText } from '../../../../styles/globalStyles';
import { mockDeliveryFees } from '../../../mocks/deliveryFeesMock';

import AdminLayout from '../../../layouts/AdminLayout/AdminLayout';
import AdminPageHeader from '../../../components/AdminPageHeader/AdminPageHeader';
import AdminCard from '../../../components/AdminCard/AdminCard';
import SectionLabel from '../../../components/SectionLabel/SectionLabel';
import FormField from '../../../components/FormField/FormField';
import Button from '../../../components/Button/Button';
import ToggleRow from '../../../components/ToggleRow/ToggleRow';
import DataListRow from '../../../components/DataListRow/DataListRow';

export default function TaxasDeEntrega() {
    const [fees, setFees] = useState(mockDeliveryFees);
    const [allowDiscounts, setAllowDiscounts] = useState(true);

    const [form, setForm] = useState({ from: '', to: '', fee: '', motoboyPayout: '' });

    const updateForm = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }));

    const handleSave = () => {
        const newFee = {
            id: Date.now(),
            from: Number(form.from),
            to: Number(form.to),
            fee: Number(form.fee),
            motoboyPayout: Number(form.motoboyPayout),
        };

        setFees((prev) => [...prev, newFee]);
        setForm({ from: '', to: '', fee: '', motoboyPayout: '' });
    };

    const handleEdit = (feeId) => {
        console.log('Editar faixa de distância', feeId);
    };

    const handleDelete = (feeId) => {
        setFees((prev) => prev.filter((fee) => fee.id !== feeId));
    };

    return (
        <AdminLayout>
            <div className="taxasDeEntregaApp">
                <AdminPageHeader
                    title="Taxas de Entrega"
                    subtitle="Defina valores por faixa de distância."
                />

                <div className="taxasDeEntregaGrid">
                    <AdminCard>
                        <SectionLabel>Cadastrar nova distância</SectionLabel>

                        <div className="taxasForm">
                            <div className="taxasFormRow">
                                <FormField label="De (km)" type="number" value={form.from} onChange={updateForm('from')} />
                                <FormField label="Até (km)" type="number" value={form.to} onChange={updateForm('to')} />
                            </div>

                            <div className="taxasFormRow">
                                <FormField label="Taxa (R$)" type="number" value={form.fee} onChange={updateForm('fee')} />
                                <FormField label="Repasse motoboy (R$)" type="number" value={form.motoboyPayout} onChange={updateForm('motoboyPayout')} />
                            </div>

                            <Button variant="solid-success" icon={<Plus size={16} />} onClick={handleSave}>
                                Salvar distância
                            </Button>
                        </div>

                        <ToggleRow
                            title="Descontos em taxas"
                            description="Permitir frete grátis e descontos por distância."
                            checked={allowDiscounts}
                            onToggle={setAllowDiscounts}
                        />
                    </AdminCard>

                    <AdminCard>
                        <SectionLabel>Distâncias cadastradas</SectionLabel>

                        <div className="taxasListHeader">
                            <NormalText fontSize="1.1rem" fontWeight="700" className="taxasListHeaderCell">Faixa</NormalText>
                            <NormalText fontSize="1.1rem" fontWeight="700" className="taxasListHeaderCell">Taxa</NormalText>
                            <NormalText fontSize="1.1rem" fontWeight="700" className="taxasListHeaderCell">Repasse motoboy</NormalText>
                            <NormalText fontSize="1.1rem" fontWeight="700" className="taxasListHeaderActions">Ações</NormalText>
                        </div>

                        {fees.map((fee) => (
                            <DataListRow
                                key={fee.id}
                                columns={[
                                    `${fee.from} km até ${fee.to} km`,
                                    `R$ ${fee.fee.toFixed(2).replace('.', ',')}`,
                                    `R$ ${fee.motoboyPayout.toFixed(2).replace('.', ',')}`,
                                ]}
                                onEdit={() => handleEdit(fee.id)}
                                onDelete={() => handleDelete(fee.id)}
                            />
                        ))}
                    </AdminCard>
                </div>
            </div>
        </AdminLayout>
    );
}