import './AdminCard.css';

export default function AdminCard({ children, className = '' }) {
    return <div className={`adminCard ${className}`}>{children}</div>;
}