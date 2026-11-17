import { useEffect, useId, useRef } from 'react';

/**
 * Floating confirmation dialog.
 *
 * Rendered above the page with a dimmed backdrop. Cancel is focused first (the
 * safe default), Escape and a backdrop click both dismiss it, and focus returns
 * to the button that opened it.
 */
export default function ConfirmDialog({
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
    busy = false,
    danger = false,
}) {
    const titleId = useId();
    const messageId = useId();
    const cancelRef = useRef(null);
    const previousFocus = useRef(null);

    useEffect(() => {
        previousFocus.current = document.activeElement;
        cancelRef.current?.focus();

        const onKey = (e) => {
            if (e.key === 'Escape') onCancel();
        };
        document.addEventListener('keydown', onKey);

        return () => {
            document.removeEventListener('keydown', onKey);
            // Put focus back where the user came from.
            if (previousFocus.current && typeof previousFocus.current.focus === 'function') {
                previousFocus.current.focus();
            }
        };
    }, [onCancel]);

    return (
        <div
            className="modal-backdrop"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onCancel();
            }}
        >
            <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={messageId}>
                <h3 className="modal-title" id={titleId}>{title}</h3>
                <p className="modal-message" id={messageId}>{message}</p>
                <div className="modal-actions">
                    <button className="btn secondary" ref={cancelRef} onClick={onCancel} disabled={busy}>
                        {cancelLabel}
                    </button>
                    <button
                        className={danger ? 'btn danger-solid' : 'btn'}
                        onClick={onConfirm}
                        disabled={busy}
                    >
                        {busy ? 'Working…' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
