const MAX_STRING_LENGTH = 500;
const MAX_NOTES_LENGTH = 2000;

// Prevent Google Sheets formula injection
function sanitizeForSheets(value) {
    if (typeof value !== 'string') return value;
    if (/^[=+\-@]/.test(value)) {
        return "'" + value;
    }
    return value;
}

const validateUserPayload = (req, res, next) => {
    const { name, value, date, email } = req.body;
    const errors = [];

    if (!name || typeof name !== 'string') {
        errors.push('name is required and must be a string');
    } else if (name.length > MAX_STRING_LENGTH) {
        errors.push(`name must be ${MAX_STRING_LENGTH} characters or less`);
    }

    if (value === undefined || value === null) {
        errors.push('value is required');
    } else if (typeof value !== 'number' && isNaN(Number(value))) {
        errors.push('value must be a number');
    }

    if (!date || typeof date !== 'string') {
        errors.push('date is required and must be a string');
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        errors.push('date must be in YYYY-MM-DD format');
    }

    if (!email || typeof email !== 'string') {
        errors.push('email is required and must be a string');
    } else if (email.length > MAX_STRING_LENGTH) {
        errors.push(`email must be ${MAX_STRING_LENGTH} characters or less`);
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('email must be a valid email address');
    }

    if (errors.length > 0) {
        return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    // Sanitize and normalize
    req.body.name = sanitizeForSheets(name.trim());
    req.body.value = Number(value);
    req.body.email = email.trim().toLowerCase();
    next();
};

//const VALID_TYPES = ['Sighting', 'Incident'];
const VALID_SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];

const validateIncidentPayload = (req, res, next) => {
    const { reportDate, type, category, severity, reportedBy, team, location, notes } = req.body;
    const errors = [];

    if (!reportDate || typeof reportDate !== 'string') {
        errors.push('reportDate is required and must be a string');
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) {
        errors.push('reportDate must be in YYYY-MM-DD format');
    }

    if (!type || typeof type !== 'string') {
        errors.push('type is required and must be a string');
    }


    if (!reportedBy || typeof reportedBy !== 'string') {
        errors.push('reportedBy is required and must be a string');
    } else if (reportedBy.length > MAX_STRING_LENGTH) {
        errors.push(`reportedBy must be ${MAX_STRING_LENGTH} characters or less`);
    }

    if (notes !== undefined && typeof notes === 'string' && notes.length > MAX_NOTES_LENGTH) {
        errors.push(`notes must be ${MAX_NOTES_LENGTH} characters or less`);
    }

    if (errors.length > 0) {
        return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    // Sanitize for Google Sheets formula injection
    req.body.reportedBy = sanitizeForSheets(reportedBy.trim());
    if (notes) {
        req.body.notes = sanitizeForSheets(notes.trim());
    }
    next();
};

module.exports = { validateUserPayload, validateIncidentPayload };
