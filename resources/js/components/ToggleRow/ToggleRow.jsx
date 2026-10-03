import './ToggleRow.css';

import { Pencil } from 'lucide-react';
import { Title, NormalText } from '../../../styles/globalStyles';

import Toggle from '../Toggle/Toggle';
import IconButton from '../IconButton/IconButton';

export default function ToggleRow({ title, description, checked, onToggle, onEdit }) {
    return (
        <div className="toggleRow">
            <div className="toggleRowInfo">
                <Title fontSize="1.4rem" fontWeight="600">{title}</Title>
                {description && <NormalText fontSize="1.3rem">{description}</NormalText>}
            </div>

            <div className="toggleRowActions">
                <Toggle checked={checked} onChange={onToggle} />
                {onEdit && (
                    <IconButton
                        icon={<Pencil size={16} color="var(--gray)" />}
                        onClick={onEdit}
                        title="Editar"
                    />
                )}
            </div>
        </div>
    );
}