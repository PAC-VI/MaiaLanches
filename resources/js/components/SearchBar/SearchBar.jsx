import './SearchBar.css';

import { Search } from 'lucide-react';

export default function SearchBar({ value, onChange, placeholder = 'Pesquisar...' }) {
    return (
        <div className="searchBar">
            <Search size={18} color="var(--gray)" />

            <input
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange?.(e.target.value)}
            />
        </div>
    );
}