import './Button.css';

export default function Button({ children, icon, variant = 'solid-success', onClick, type = 'button' }) {
    return (
        <button type={type} className={`appButton appButton-${variant}`} onClick={onClick}>
            {icon}
            {children}
        </button>
    );
}