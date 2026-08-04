import React from 'react';

const Modal = ({ children, onClose, itFreeClose = true, width = 500, height = 'auto' }) => {
    const handleBackdropClick = (e) => {
        if (itFreeClose && e.target === e.currentTarget) {
            onClose();
        }
    };

    React.useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && itFreeClose) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden'; // Блокируем прокрутку страницы

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset'; // Восстанавливаем прокрутку
        };
    }, [itFreeClose, onClose]);

    const modalContentStyle = {
        width: typeof width === 'number' ? `${width}px` : width,
        height: height === 'auto' ? 'auto' : (typeof height === 'number' ? `${height}px` : height),
        maxWidth: '90vw', // Максимальная ширина 90% от viewport
        maxHeight: '90vh', // Максимальная высота 90% от viewport
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
        boxSizing: 'border-box'
    };

    // Стили для переопределения дочерних элементов
    const childrenWrapperStyle = {
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
    };

    return (
        <div className="modal-overlay" onClick={handleBackdropClick}>
            <div className="modal-content" style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                <button className="modal-close-button" onClick={onClose} aria-label="Закрыть">
                    ×
                </button>
                <div style={childrenWrapperStyle}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
