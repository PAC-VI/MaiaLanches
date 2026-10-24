import './Button.css';

export default function Button({ children, icon, variant = 'solid-success', onClick, type = 'button', className = '' }) {
    return (
        <button type={type} className={`appButton appButton-${variant} ${className}`} onClick={onClick}>
            {icon}
            {children}
        </button>
    );
}