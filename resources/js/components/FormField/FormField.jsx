import './FormField.css';

import { NormalText } from '../../../styles/globalStyles';

export default function FormField({ label, value, onChange, type = 'text', placeholder }) {
    return (
        <label className="formField">
            <NormalText fontSize="1.2rem">{label}</NormalText>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange?.(e.target.value)}
                placeholder={placeholder}
            />
        </label>
    );
}