import './AdminPageHeader.css';
import { Title, NormalText } from '../../../styles/globalStyles';

export default function AdminPageHeader({ title, subtitle, children }) {
    return (
        <div className="adminPageHeader">
            <div className="adminPageHeaderText">
                <Title fontSize="2.2rem">{title}</Title>
                {subtitle && <NormalText fontSize="1.3rem">{subtitle}</NormalText>}
            </div>

            {children && <div className="adminPageHeaderActions">{children}</div>}
        </div>
    );
}