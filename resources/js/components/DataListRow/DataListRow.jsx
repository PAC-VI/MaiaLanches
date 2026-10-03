import './DataListRow.css';

import { Pencil, Trash2 } from 'lucide-react';

import IconButton from '../IconButton/IconButton';

export default function DataListRow({ columns, onEdit, onDelete }) {
    return (
        <div className="dataListRow">
            {columns.map((column, index) => (
                <div key={index} className="dataListCell">
                    {column}
                </div>
            ))}

            <div className="dataListActions">
                <IconButton icon={<Pencil size={16} color="var(--gray)" />} onClick={onEdit} title="Editar" />
                <IconButton icon={<Trash2 size={16} color="var(--gray)" />} onClick={onDelete} variant="danger" title="Excluir" />
            </div>
        </div>
    );
}