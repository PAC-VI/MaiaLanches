import './IconButton.css';

export default function IconButton({ icon, onClick, variant = 'neutral', title }) {
    return (
        <button
            type="button"
            className={`iconActionButton iconActionButton-${variant}`}
            onClick={onClick}
            title={title}
        >
            {icon}
        </button>
    );
}