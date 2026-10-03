import { useState } from 'react';
import './Horarios.css';

import AdminLayout from '../../../layouts/AdminLayout/AdminLayout';
import AdminPageHeader from '../../../components/AdminPageHeader/AdminPageHeader';
import AdminCard from '../../../components/AdminCard/AdminCard';
import SectionLabel from '../../../components/SectionLabel/SectionLabel';
import Button from '../../../components/Button/Button';
import Badge from '../../../components/Badge/Badge';
import DataListRow from '../../../components/DataListRow/DataListRow';

import { Plus } from 'lucide-react';
import { NormalText } from '../../../../styles/globalStyles';

import { mockSchedules } from '../../../mocks/scheduleMock';

export default function Horarios() {
    const [schedules, setSchedules] = useState(mockSchedules);

    const handleNewSchedule = () => {
        console.log('Novo horário');
    };

    const handleEdit = (scheduleId) => {
        console.log('Editar padrão de horário', scheduleId);
    };

    const handleDelete = (scheduleId) => {
        setSchedules((prev) => prev.filter((schedule) => schedule.id !== scheduleId));
    };

    return (
        <AdminLayout>
            <div className="padroesDeHorarioApp">
                <AdminPageHeader
                    title="Padrões de Horário"
                    subtitle="Defina qual padrão de funcionamento está ativo."
                >
                    <Button variant="solid-success" icon={<Plus size={16} />} onClick={handleNewSchedule}>
                        Novo horário
                    </Button>
                </AdminPageHeader>

                <AdminCard>
                    <SectionLabel>Padrões cadastrados</SectionLabel>

                    <div className="scheduleListHeader">
                        <NormalText fontSize="1.1rem" fontWeight="700" className="scheduleListHeaderCell">Padrão</NormalText>
                        <NormalText fontSize="1.1rem" fontWeight="700" className="scheduleListHeaderCell">Horário</NormalText>
                        <NormalText fontSize="1.1rem" fontWeight="700" className="scheduleListHeaderCell">Padrão ativo</NormalText>
                        <NormalText fontSize="1.1rem" fontWeight="700" className="scheduleListHeaderCell">Aberto agora</NormalText>
                        <NormalText fontSize="1.1rem" fontWeight="700" className="scheduleListHeaderActions">Ações</NormalText>
                    </div>

                    {schedules.map((schedule) => (
                        <DataListRow
                            key={schedule.id}
                            columns={[
                                schedule.name,
                                schedule.hours,
                                <Badge variant={schedule.active ? 'green' : 'neutral'}>
                                    {schedule.active ? 'Ativo' : 'Inativo'}
                                </Badge>,
                                <Badge variant={schedule.isOpenNow ? 'green' : 'red'}>
                                    {schedule.isOpenNow ? 'Aberto' : 'Fechado'}
                                </Badge>,
                            ]}
                            onEdit={() => handleEdit(schedule.id)}
                            onDelete={() => handleDelete(schedule.id)}
                        />
                    ))}
                </AdminCard>
            </div>
        </AdminLayout>
    );
}