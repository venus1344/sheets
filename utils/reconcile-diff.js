const USERS_DEFAULT_DEPARTMENT = 'Antipoaching';

const text = (value) => String(value ?? '');

const userSnapshot = (row, email) => ({
    name: text(row[0]),
    department: text(row[1]),
    value: text(row[2]),
    date: text(row[3]),
    email,
});

const incidentSnapshot = (row, incidentId) => ({
    reportDate: text(row[0]),
    type: text(row[1]),
    reportedBy: text(row[2]),
    notes: text(row[3]),
    incidentId,
});

/**
 * Compute the difference between the current sheet rows and the authoritative
 * TAI data set. Pure functions — no Google API access — so they are unit-testable.
 *
 * Sheet layouts:
 *   users:     [Name, Department, Value, Date, Email]
 *   incidents: [Report Date, Type, Reported By, Notes, Incident ID]
 *
 * @returns {{stats: {checked: number, added: number, updated: number, deleted: number}, updates: Array, toAppend: Array, rowsToDelete: number[], details: {updated: Array, deleted: Array}}}
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
    const updateDetails = [];
    const deleteDetails = [];
    let added = 0;
    let updated = 0;
    let deleted = 0;

    for (const [email, index] of emailToIndex) {
        const tai = tais.get(email);
        const row = rows[index] || [];

        if (!tai) {
            rowsToDelete.push(index);
            deleteDetails.push({ key: email, record: userSnapshot(row, email) });
            deleted += 1;
            continue;
        }

        const changes = [];
        if (String(row[0] ?? '') !== String(tai.name ?? '')) {
            changes.push({ field: 'Name', from: text(row[0]), to: text(tai.name) });
        }
        if (Number(row[2]) !== Number(tai.value)) {
            changes.push({ field: 'Value', from: text(row[2]), to: text(tai.value) });
        }
        if (String(row[3] ?? '') !== String(tai.date ?? '')) {
            changes.push({ field: 'Date', from: text(row[3]), to: text(tai.date) });
        }

        if (changes.length) {
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
            updateDetails.push({ key: email, changes });
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
        details: { updated: updateDetails, deleted: deleteDetails },
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
    const updateDetails = [];
    const deleteDetails = [];
    let added = 0;
    let updated = 0;
    let deleted = 0;

    for (const [id, index] of idToIndex) {
        const tai = tais.get(id);
        const row = rows[index] || [];

        if (!tai) {
            rowsToDelete.push(index);
            deleteDetails.push({ key: id, record: incidentSnapshot(row, id) });
            deleted += 1;
            continue;
        }

        const newRow = [
            String(tai.reportDate ?? ''),
            String(tai.type ?? ''),
            String(tai.reportedBy ?? ''),
            String(tai.notes ?? ''),
            id,
        ];

        const unchanged = newRow.every((value, col) => String(row[col] ?? '').trim() === value);
        if (!unchanged) {
            const changes = [];
            ['Report Date', 'Type', 'Reported By', 'Notes'].forEach((field, col) => {
                if (String(row[col] ?? '').trim() !== newRow[col]) {
                    changes.push({ field, from: text(row[col]), to: newRow[col] });
                }
            });

            updates.push({ index, values: newRow });
            updateDetails.push({ key: id, changes });
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
        details: { updated: updateDetails, deleted: deleteDetails },
    };
}

module.exports = { computeUsersDiff, computeIncidentsDiff, USERS_DEFAULT_DEPARTMENT };
