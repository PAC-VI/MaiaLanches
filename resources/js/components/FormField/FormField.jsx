import './FormField.css';

import { NormalText } from '../../../styles/globalStyles';

export default function FormField({
    label,
    value,
    onChange,
    type = 'text',
    placeholder,
    icon,
    rightElement,
    disabled = false,
    hint,
    maxLength,
    min,
    max,
    step,
    inputMode,
    autoComplete,
    multiline = false,
    rows = 4,
}) {
    const text = String(value ?? '');

    const handleKeyDown = (event) => {
        if (event.key !== 'Enter') {
            return;
        }

        event.preventDefault();

        const element = event.currentTarget;
        const start = element.selectionStart ?? text.length;
        const end = element.selectionEnd ?? text.length;
        const next = `${text.slice(0, start)}\n${text.slice(end)}`;

        if (maxLength && next.length > maxLength) {
            return;
        }

        onChange?.(next);

        const cursor = start + 1;
        requestAnimationFrame(() => {
            element.selectionStart = cursor;
            element.selectionEnd = cursor;
        });
    };

    return (
        <label className="formField">
            <NormalText fontSize="1.2rem">{label}</NormalText>

            <div className="formFieldInputWrapper">
                {icon && <span className="formFieldIcon">{icon}</span>}

                {multiline ? (
                    <textarea
                        value={text}
                        rows={rows}
                        placeholder={placeholder}
                        disabled={disabled}
                        maxLength={maxLength}
                        autoComplete={autoComplete}
                        onChange={(e) => onChange?.(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                ) : (
                    <input
                        type={type}
                        value={value}
                        onChange={(e) => onChange?.(e.target.value)}
                        placeholder={placeholder}
                        className={icon ? 'hasIcon' : ''}
                        disabled={disabled}
                        maxLength={maxLength}
                        min={min}
                        max={max}
                        step={step}
                        inputMode={inputMode}
                        autoComplete={autoComplete}
                    />
                )}

                {rightElement && <span className="formFieldRightElement">{rightElement}</span>}
            </div>

            {multiline && maxLength ? (
                <NormalText className="formFieldCounter" fontSize="1.1rem">{`${text.length}/${maxLength}`}</NormalText>
            ) : null}

            {hint && <NormalText fontSize="1.1rem">{hint}</NormalText>}
        </label>
    );
}