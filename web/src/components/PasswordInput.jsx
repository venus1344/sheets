import { useState } from 'react';

function EyeIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            <path d="M1.8 12S5.5 5 12 5s10.2 7 10.2 7-3.7 7-10.2 7S1.8 12 1.8 12Z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}

function EyeOffIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            <path d="M10.6 6.2A9.7 9.7 0 0 1 12 6c6.5 0 10.2 6 10.2 6a17 17 0 0 1-2.9 3.6" />
            <path d="M6.3 7.9A16.8 16.8 0 0 0 1.8 12s3.7 6 10.2 6a9.8 9.8 0 0 0 4.2-.9" />
            <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
            <path d="M3 3l18 18" />
        </svg>
    );
}

/**
 * Password field with a Show/Hide toggle.
 *
 * The toggle is a real button inside the field's tap area (36x30 hit target)
 * using the familiar open-eye / crossed-eye icons, with an accessible name so
 * it still reads correctly to screen readers. It flips the input type without
 * remounting, so the typed value and cursor position are preserved.
 *
 * The label and the field are siblings (linked by id/htmlFor) so the toggle
 * never leaks into the input's accessible name.
 */
export default function PasswordInput({ id, label = 'Password', value, onChange, hint, autoComplete = 'current-password', ...rest }) {
    const [visible, setVisible] = useState(false);

    return (
        <div className="field">
            <label htmlFor={id}>{label}</label>
            <span className="input-wrap">
                <input
                    id={id}
                    type={visible ? 'text' : 'password'}
                    value={value}
                    onChange={onChange}
                    autoComplete={autoComplete}
                    {...rest}
                />
                <button
                    type="button"
                    className="reveal-btn"
                    onClick={() => setVisible((v) => !v)}
                    aria-label={visible ? 'Hide password' : 'Show password'}
                    aria-pressed={visible}
                    title={visible ? 'Hide password' : 'Show password'}
                >
                    {visible ? <EyeOffIcon /> : <EyeIcon />}
                </button>
            </span>
            {hint && <span className="hint">{hint}</span>}
        </div>
    );
}
