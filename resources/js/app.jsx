import React from 'react';
import { createRoot } from 'react-dom/client';

function App() {
    return <h1>Maia Lanches - React funcionando!</h1>;
}

const root = document.getElementById('app');

if (root) {
    createRoot(root).render(<App />);
}