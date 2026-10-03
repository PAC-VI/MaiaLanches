import './SectionLabel.css';

import { NormalText } from '../../../styles/globalStyles';

export default function SectionLabel({ children }) {
    return (
        <NormalText fontSize="1.1rem" fontWeight="700" className="sectionLabel">
            {children}
        </NormalText>
    );
}