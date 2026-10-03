import './HeroMetricCard.css';

import { ArrowUpRight } from 'lucide-react';
import { Title, NormalText } from '../../../styles/globalStyles';

export default function HeroMetricCard({ label, value, trendText, note, stats }) {
    return (
        <div className="heroMetricCard">
            <div className="heroMetricMain">
                <NormalText fontSize="1.2rem" fontWeight="700" color="var(--gray-border-darker)" className="heroMetricLabel">
                    {label}
                </NormalText>

                <Title fontSize="3.6rem" color="var(--white)">{value}</Title>

                <div className="heroMetricTrend">
                    <ArrowUpRight size={16} color="var(--warning-green)" />
                    <NormalText fontSize="1.3rem" color="var(--warning-green)">{trendText}</NormalText>
                </div>

                {note && (
                    <NormalText fontSize="1.2rem" color="var(--gray-border-darker)">{note}</NormalText>
                )}
            </div>

            <div className="heroMetricStats">
                {stats.map((stat) => (
                    <div key={stat.label} className="heroMetricStatItem">
                        <NormalText fontSize="1.1rem" fontWeight="700" color="var(--gray-border-darker)" className="heroMetricLabel">
                            {stat.label}
                        </NormalText>
                        <Title fontSize="1.8rem" color="var(--white)">{stat.value}</Title>
                        {stat.helper && (
                            <NormalText fontSize="1.1rem" color="var(--gray-border-darker)">{stat.helper}</NormalText>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}