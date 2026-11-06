import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './Modal.css';

export default function Modal({ isOpen, onClose, children, blockDismiss = false }) {
    const contentRef = useRef(null);
    const touchOnOverlayRef = useRef(false);
    const lastDismissAtRef = useRef(0);
    const signalBlockedRef = useRef(() => {});
    const [openSnapshot, setOpenSnapshot] = useState(isOpen);
    const [phase, setPhase] = useState('enter');

    if (isOpen !== openSnapshot) {
        setOpenSnapshot(isOpen);
        if (isOpen) {
            setPhase('enter');
        }
    }

    signalBlockedRef.current = () => {
        setPhase((current) => (current === 'shake' ? 'idle' : current));
        requestAnimationFrame(() => {
            setPhase('shake');
        });
    };

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (event) => {
            if (event.key !== 'Escape') {
                return;
            }

            if (blockDismiss) {
                event.preventDefault();
                signalBlockedRef.current();
                return;
            }

            onClose?.();
        };

        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose, blockDismiss]);

    if (!isOpen) return null;

    const requestDismiss = () => {
        const now = Date.now();
        if (now - lastDismissAtRef.current < 500) {
            return;
        }

        lastDismissAtRef.current = now;

        if (blockDismiss) {
            signalBlockedRef.current();
            return;
        }

        onClose?.();
    };

    const handleOverlayClick = (event) => {
        if (event.target === event.currentTarget) {
            requestDismiss();
        }
    };

    const handleAnimationEnd = (event) => {
        if (event.target !== event.currentTarget) {
            return;
        }

        if (event.animationName === 'modalScaleIn') {
            setPhase((current) => (current === 'enter' ? 'idle' : current));
        }

        if (event.animationName === 'modalShake') {
            setPhase('idle');
        }
    };

    const contentClass = [
        'modalContent',
        phase === 'enter' ? 'modalContentEnter' : '',
        phase === 'shake' ? 'modalContentShake' : '',
    ].filter(Boolean).join(' ');

    return createPortal(
        <div
            className="modalOverlay"
            onClick={handleOverlayClick}
            onTouchStart={(event) => {
                touchOnOverlayRef.current = event.target === event.currentTarget;
            }}
            onTouchEnd={(event) => {
                if (event.target === event.currentTarget && touchOnOverlayRef.current) {
                    requestDismiss();
                }
                touchOnOverlayRef.current = false;
            }}
        >
            <div
                ref={contentRef}
                className={contentClass}
                onAnimationEnd={handleAnimationEnd}
            >
                {children}
            </div>
        </div>,
        document.body
    );
}
