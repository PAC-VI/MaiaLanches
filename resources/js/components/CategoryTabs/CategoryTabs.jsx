import './CategoryTabs.css';

export default function CategoryTabs({ categories, activeCategory, onSelect }) {
    return (
        <div className="categoryTabs">
            {categories.map((category) => (
                <button
                    key={category}
                    className={`categoryTab ${category === activeCategory ? 'active' : ''}`}
                    onClick={() => onSelect(category)}
                >
                    {category}
                </button>
            ))}
        </div>
    );
}