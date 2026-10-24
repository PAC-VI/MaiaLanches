import './CentralDePagamentos.css';

import { useState } from 'react';
import { adminPaymentMethods } from '../../../mocks/adminPaymentMethodsMock';

import AdminLayout from '../../../layouts/AdminLayout/AdminLayout';
import AdminPageHeader from '../../../components/AdminPageHeader/AdminPageHeader';
import AdminCard from '../../../components/AdminCard/AdminCard';
import SectionLabel from '../../../components/SectionLabel/SectionLabel';
import ToggleRow from '../../../components/ToggleRow/ToggleRow';

export default function CentralDePagamentos() {
    const [paymentMethods, setPaymentMethods] = useState(adminPaymentMethods);

    const handleToggle = (methodId, value) => {
        setPaymentMethods((prev) =>
            prev.map((method) =>
                method.id === methodId ? { ...method, active: value } : method
            )
        );
    };

    const handleEdit = (methodId) => {
        console.log('Editar forma de pagamento', methodId);
    };

    return (
        <AdminLayout>
            <div className="centralDePagamentosApp">
                <AdminPageHeader
                    title="Central de Pagamentos"
                    subtitle="Formas de pagamento aceitas na loja."
                />

                <AdminCard>
                    <SectionLabel>Formas de pagamento</SectionLabel>

                    {paymentMethods.map((method) => (
                        <ToggleRow
                            key={method.id}
                            title={method.name}
                            description={method.description}
                            checked={method.active}
                            onToggle={(value) => handleToggle(method.id, value)}
                            onEdit={() => handleEdit(method.id)}
                        />
                    ))}
                </AdminCard>
            </div>
        </AdminLayout>
    );
}