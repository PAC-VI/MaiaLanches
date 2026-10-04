import './FormField.css';

import { NormalText } from '../../../styles/globalStyles';

export default function FormField({ label, value, onChange, type = 'text', placeholder, icon, rightElement }) {
    return (
        <label className="formField">
            <NormalText fontSize="1.2rem">{label}</NormalText>

            <div className="formFieldInputWrapper">
                {icon && <span className="formFieldIcon">{icon}</span>}

                <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange?.(e.target.value)}
                    placeholder={placeholder}
                    className={icon ? 'hasIcon' : ''}
                />

                {rightElement && <span className="formFieldRightElement">{rightElement}</span>}
            </div>
        </label>
    );
}