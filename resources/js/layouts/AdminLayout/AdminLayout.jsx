import './AdminLayout.css';

export default function AdminLayout({ children }) {
    return (
        <div className="adminWrapper">
            <aside className="adminSidebar">
                <h2>Admin</h2>
                <p>Menu virá aqui</p>
            </aside>

            {/* Área onde as páginas (Produtos, Pedidos) serão renderizadas */}
            <main className="adminContent">
                {children}
            </main>
            
        </div>
    );
}