import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import { GlobalStyle } from '../styles/globalStyles';
import AdminLayout from './layouts/AdminLayout/AdminLayout';

createInertiaApp({
    resolve: name => {
        const pages = import.meta.glob('./pages/**/*.jsx', { eager: true });
        const page = pages[`./pages/${name}.jsx`];

        // Mesma referência de layout em todas as telas do painel: o header não remonta.
        if (name.startsWith('Admin/') && name !== 'Admin/Login/Login') {
            page.default.layout = AdminLayout;
        }

        return page;
    },
    setup({ el, App, props }) {
        createRoot(el).render(
            <>
                <GlobalStyle />
                <App {...props} />
            </>
        );
    },
});