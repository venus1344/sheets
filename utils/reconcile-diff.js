const USERS_DEFAULT_DEPARTMENT = 'Antipoaching';

/**
 * Compute the difference between the current sheet rows and the authoritative
 * TAI data set. Pure functions — no Google API access — so they are unit-testable.
 *
 * Sheet layouts:
 *   users:     [Name, Department, Value, Date, Email]
 *   incidents: [Report Date, Type, Reported By, Notes, Incident ID]
 *
 * @returns {{stats: {checked: number, added: number, updated: number, deleted: number}, updates: Array, toAppend: Array, rowsToDelete: number[]}}
 */
function computeUsersDiff(rows, users) {
    const emailToIndex = new Map();
    rows.forEach((row, i) => {
        const email = String(row[4] || '').trim().toLowerCase();
        if (email) emailToIndex.set(email, i);
    });

    const tais = new Map();
    for (const u of users) {
        const email = String(u.email || '').trim().toLowerCase();
        if (email) tais.set(email, u);
    }

    const updates = [];
    const toAppend = [];
    const rowsToDelete = [];
    let added = 0;
    let updated = 0;
    let deleted = 0;

    for (const [email, index] of emailToIndex) {
        const tai = tais.get(email);
        if (!tai) {
            rowsToDelete.push(index);
            deleted += 1;
            continue;
        }

        const row = rows[index];
        if (
            String(row[0] ?? '') !== String(tai.name ?? '') ||
            Number(row[2]) !== Number(tai.value) ||
            String(row[3] ?? '') !== String(tai.date ?? '')
        ) {
            updates.push({
                index,
                values: [
                    String(tai.name ?? ''),
                    row[1] || USERS_DEFAULT_DEPARTMENT,
                    Number(tai.value),
                    String(tai.date ?? ''),
                    email,
                ],
            });
            updated += 1;
        }
    }

    for (const [email, tai] of tais) {
        if (!emailToIndex.has(email)) {
            toAppend.push([
                String(tai.name ?? ''),
                USERS_DEFAULT_DEPARTMENT,
                Number(tai.value),
                String(tai.date ?? ''),
                email,
            ]);
            added += 1;
        }
    }

    return {
        stats: { checked: emailToIndex.size + tais.size, added, updated, deleted },
        updates,
        toAppend,
        rowsToDelete,
    };
}

function computeIncidentsDiff(rows, incidents) {
    const idToIndex = new Map();
    rows.forEach((row, i) => {
        const id = String(row[4] || '').trim();
        if (id) idToIndex.set(id, i);
    });

    const tais = new Map();
    for (const inc of incidents) {
        const id = String(inc.incidentId ?? '').trim();
        if (id) tais.set(id, inc);
    }

    const updates = [];
    const toAppend = [];
    const rowsToDelete = [];
    let added = 0;
    let updated = 0;
    let deleted = 0;

    for (const [id, index] of idToIndex) {
        const tai = tais.get(id);
        if (!tai) {
            rowsToDelete.push(index);
            deleted += 1;
            continue;
        }

        const row = rows[index];
        const newRow = [
            String(tai.reportDate ?? ''),
            String(tai.type ?? ''),
            String(tai.reportedBy ?? ''),
            String(tai.notes ?? ''),
            id,
        ];

        const unchanged = newRow.every((value, col) => String(row[col] ?? '').trim() === value);
        if (!unchanged) {
            updates.push({ index, values: newRow });
            updated += 1;
        }
    }

    for (const [id, tai] of tais) {
        if (!idToIndex.has(id)) {
            toAppend.push([
                String(tai.reportDate ?? ''),
                String(tai.type ?? ''),
                String(tai.reportedBy ?? ''),
                String(tai.notes ?? ''),
                id,
            ]);
            added += 1;
        }
    }

    return {
        stats: { checked: idToIndex.size + tais.size, added, updated, deleted },
        updates,
        toAppend,
        rowsToDelete,
    };
}

module.exports = { computeUsersDiff, computeIncidentsDiff, USERS_DEFAULT_DEPARTMENT };
