/** Small 18px stroke icons used by row actions. */

const base = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
    focusable: 'false',
};

export function TrashIcon() {
    return (
        <svg {...base}>
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M6 6l1 14h10l1-14" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
        </svg>
    );
}

export function RestoreIcon() {
    return (
        <svg {...base}>
            <path d="M3.5 10.5h10a5 5 0 0 1 0 10H9" />
            <path d="M7.5 6.5l-4 4 4 4" />
        </svg>
    );
}
