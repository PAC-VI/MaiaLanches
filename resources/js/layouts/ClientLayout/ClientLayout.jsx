import './ClientLayout.css';

export default function ClientLayout({ children }) {
    return (
        <div className="clientWrapper">
            <main className="clientContainer">
                {children}
            </main>
        </div>
    );
}