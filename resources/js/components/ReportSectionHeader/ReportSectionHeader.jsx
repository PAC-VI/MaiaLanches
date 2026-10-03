import './ReportSectionHeader.css';

import { Title, NormalText } from '../../../styles/globalStyles';

export default function ReportSectionHeader({ title, description }) {
    return (
        <div className="reportSectionHeader">
            <Title fontSize="1.3rem" fontWeight="700" className="reportSectionTitle">
                {title}
            </Title>
            <NormalText fontSize="1.2rem">{description}</NormalText>
        </div>
    );
}