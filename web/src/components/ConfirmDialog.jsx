import { useRef } from 'react';
import Modal from './Modal.jsx';

/**
 * Destructive confirmation, built on the shared Modal so both dialogs look and
 * behave the same. Cancel is focused first (the safe default), and Escape or a
 * backdrop click dismisses.
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
    const cancelRef = useRef(null);

    return (
        <Modal
            title={title}
            subtitle={message}
            onClose={onCancel}
            initialFocusRef={cancelRef}
            footer={
                <>
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
                </>
            }
        />
    );
}
