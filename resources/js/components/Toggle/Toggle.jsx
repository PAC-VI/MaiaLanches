import './Toggle.css';

export default function Toggle({ checked, onChange, disabled = false }) {
    return (
        <button
            type="button"
            className={`toggleSwitch ${checked ? 'checked' : ''}`}
            onClick={() => !disabled && onChange?.(!checked)}
            disabled={disabled}
            aria-pressed={checked}
        >
            <span className="toggleKnob" />
        </button>
    );
}