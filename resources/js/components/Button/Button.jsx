import './Button.css';

export default function Button({ children, icon, variant = 'solid-success', onClick, type = 'button', className = '', disabled = false }) {
    return (
        <button
            type={type}
            className={`appButton appButton-${variant} ${className}`}
            onClick={onClick}
            disabled={disabled}
        >
            {icon}
            {children}
        </button>
    );
}