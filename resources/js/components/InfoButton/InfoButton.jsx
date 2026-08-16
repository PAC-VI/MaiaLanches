import './InfoButton.css';

import { Title } from '../../../styles/globalStyles';

export default function InfoButton({ icon, label, onClick }) {
    return (
        <button className="infoButtonCard" onClick={onClick}>
            <div className="infoButtonIcon">
                {icon}
            </div>

            <Title fontSize="1.2rem" fontWeight="500">
                {label}
            </Title>
        </button>
    )
}