import './Relatorios.css';

import { useState } from 'react';

import AdminPageHeader from '../../../components/AdminPageHeader/AdminPageHeader';
import Badge from '../../../components/Badge/Badge';
import HeroMetricCard from '../../../components/HeroMetricCard/HeroMetricCard';
import ReportSectionHeader from '../../../components/ReportSectionHeader/ReportSectionHeader';
import MetricCard from '../../../components/MetricCard/MetricCard';
import { NormalText } from '../../../../styles/globalStyles';

import { apiFetch } from '../../../lib/adminApi';
import { usePolling } from '../../../lib/usePolling';
import { buildReports } from '../../../lib/reports';

function errorMessage(err) {
    if (err?.status === 419) {
        return 'Sessão expirada. Recarregue a página.';
    }

    return 'Não foi possível carregar os relatórios agora.';
}

export default function Relatorios() {
    const [orders, setOrders] = useState([]);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [loadError, setLoadError] = useState(null);

    const loadOrders = async () => {
        try {
            const response = await apiFetch('/orders');
            const list = response.data ?? response;
            setOrders(Array.isArray(list) ? list : []);
            setLoadError(null);
            setHasLoaded(true);
        } catch (err) {
            setLoadError(errorMessage(err));
        } finally {
            setIsInitialLoading(false);
        }
    };

    usePolling(loadOrders, 15000);

    const { reportsHero, reportSections } = buildReports(orders);

    return (
            <div className="relatoriosApp">
                <AdminPageHeader
                    title="Relatórios"
                    subtitle="Os números da loja em cards diretos, sem gráficos."
                >
                    <Badge variant="green">Período: últimos 30 dias</Badge>
                </AdminPageHeader>

                {loadError && (
                    <NormalText fontSize="1.3rem" color="var(--main-red)">
                        {loadError}
                    </NormalText>
                )}

                {isInitialLoading ? (
                    <NormalText fontSize="1.3rem">Carregando relatórios...</NormalText>
                ) : hasLoaded && (
                    <>
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
                    </>
                )}
            </div>
    );
}
