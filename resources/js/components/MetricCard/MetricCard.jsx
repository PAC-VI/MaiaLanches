import './MetricCard.css';

import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Title, NormalText } from '../../../styles/globalStyles';

export default function MetricCard({ label, value, trend, helperText }) {
    return (
        <div className="metricCard">
            <NormalText fontSize="1.1rem" fontWeight="700" className="metricCardLabel">
                {label}
            </NormalText>

            <Title fontSize="2rem">{value}</Title>

            {trend && (
                <div className="metricCardTrend">
                    {trend.direction === 'up' ? (
                        <ArrowUpRight size={14} color="var(--warning-green)" />
                    ) : (
                        <ArrowDownRight size={14} color="var(--main-red)" />
                    )}
                    <NormalText
                        fontSize="1.2rem"
                        color={trend.direction === 'up' ? 'var(--warning-green)' : 'var(--main-red)'}
                    >
                        {trend.text}
                    </NormalText>
                </div>
            )}

            {helperText && (
                <NormalText fontSize="1.2rem">{helperText}</NormalText>
            )}
        </div>
    );
}