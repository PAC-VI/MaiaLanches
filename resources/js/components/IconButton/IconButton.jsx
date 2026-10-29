import './IconButton.css';

export default function IconButton({ icon, onClick, variant = 'neutral', title, disabled = false }) {
    const button = (
        <button
            type="button"
            className={`iconActionButton iconActionButton-${variant}`}
            onClick={onClick}
            title={disabled ? undefined : title}
            aria-label={title}
            disabled={disabled}
        >
            {icon}
        </button>
    );

    if (!disabled || !title) {
        return button;
    }

    return (
        <span className="iconActionButtonWrap" title={title}>
            {button}
        </span>
    );
}