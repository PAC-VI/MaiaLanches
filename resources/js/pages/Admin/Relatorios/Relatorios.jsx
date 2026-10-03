import './Relatorios.css';

import { reportsHero, reportSections } from '../../../mocks/reportsMock';

import AdminLayout from '../../../layouts/AdminLayout/AdminLayout';
import AdminPageHeader from '../../../components/AdminPageHeader/AdminPageHeader';
import Badge from '../../../components/Badge/Badge';
import HeroMetricCard from '../../../components/HeroMetricCard/HeroMetricCard';
import ReportSectionHeader from '../../../components/ReportSectionHeader/ReportSectionHeader';
import MetricCard from '../../../components/MetricCard/MetricCard';

export default function Relatorios() {
    return (
        <AdminLayout>
            <div className="relatoriosApp">
                <AdminPageHeader
                    title="Relatórios"
                    subtitle="Os números da loja em cards diretos, sem gráficos."
                >
                    <Badge variant="green">Período: últimos 30 dias</Badge>
                </AdminPageHeader>

                <HeroMetricCard {...reportsHero} />

                {reportSections.map((section) => (
                    <div key={section.title} className="reportSection">
                        <ReportSectionHeader title={section.title} description={section.description} />

                        <div className="reportsGrid">
                            {section.metrics.map((metric) => (
                                <MetricCard key={metric.label} {...metric} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </AdminLayout>
    );
}