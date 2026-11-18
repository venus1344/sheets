import { useEffect, useId, useRef } from 'react';
import { CloseIcon } from './icons.jsx';

/**
 * Generic floating modal: dimmed backdrop, Escape/backdrop dismissal, a close
 * button, and focus moved into the dialog then returned to the trigger.
 *
 * `initialFocusRef` lets a destructive dialog start on its safe option instead
 * of the close button.
 */
export default function Modal({ title, subtitle, children, footer, onClose, wide = false, initialFocusRef = null }) {
    const titleId = useId();
    const dialogRef = useRef(null);
    const previousFocus = useRef(null);

    useEffect(() => {
        previousFocus.current = document.activeElement;
        // Focus the dialog itself so the keyboard stays inside it without putting
        // a heavy focus ring on the close button; destructive dialogs pass their
        // own safe target instead.
        (initialFocusRef?.current || dialogRef.current)?.focus();

        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);

        return () => {
            document.removeEventListener('keydown', onKey);
            if (previousFocus.current && typeof previousFocus.current.focus === 'function') {
                previousFocus.current.focus();
            }
        };
    }, [onClose, initialFocusRef]);

    return (
        <div
            className="modal-backdrop"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className={`modal${wide ? ' modal-wide' : ''}`}
                ref={dialogRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
            >
                <div className="modal-header">
                    <h3 className="modal-title" id={titleId}>{title}</h3>
                    <button
                        type="button"
                        className="icon-btn"
                        onClick={onClose}
                        aria-label="Close"
                        title="Close"
                    >
                        <CloseIcon />
                    </button>
                </div>

                {subtitle && <p className="modal-subtitle">{subtitle}</p>}

                {children ? <div className="modal-body">{children}</div> : null}

                {footer && <div className="modal-actions">{footer}</div>}
            </div>
        </div>
    );
}
