import './AdminPageHeader.css';
import { Title, NormalText } from '../../../styles/globalStyles';

export default function AdminPageHeader({ title, subtitle, notice, children }) {
    return (
        <div className="adminPageHeader">
            <div className="adminPageHeaderText">
                <Title fontSize="2.2rem">{title}</Title>
                {subtitle && <NormalText fontSize="1.3rem">{subtitle}</NormalText>}
                {notice && <NormalText fontSize="1.1rem" color="var(--gray)">{notice}</NormalText>}
            </div>

            {children && <div className="adminPageHeaderActions">{children}</div>}
        </div>
    );
}