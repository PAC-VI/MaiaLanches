import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import './Modal.css';

export default function Modal({ isOpen, onClose, children }) {
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose?.();
        };

        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleOverlayClick = (e) => {
        // só fecha se o clique foi no overlay, não no conteúdo
        if (e.target === e.currentTarget) onClose?.();
    };

    return createPortal(
        <div className="modalOverlay" onClick={handleOverlayClick}>
            <div className="modalContent">
                {children}
            </div>
        </div>,
        document.body
    );
}