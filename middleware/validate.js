const validateUserPayload = (req, res, next) => {
    const { name, value, date, email } = req.body;
    const errors = [];

    if (!name || typeof name !== 'string') {
        errors.push('name is required and must be a string');
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
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('email must be a valid email address');
    }

    if (errors.length > 0) {
        return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    req.body.value = Number(value);
    next();
};

const VALID_TYPES = ['Sighting', 'Incident'];
const VALID_SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];

const validateIncidentPayload = (req, res, next) => {
    const { reportDate, type, category, severity, reportedBy, team, location } = req.body;
    const errors = [];

    if (!reportDate || typeof reportDate !== 'string') {
        errors.push('reportDate is required and must be a string');
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) {
        errors.push('reportDate must be in YYYY-MM-DD format');
    }

    if (!type || typeof type !== 'string') {
        errors.push('type is required and must be a string');
    } else if (!VALID_TYPES.includes(type)) {
        errors.push(`type must be one of: ${VALID_TYPES.join(', ')}`);
    }

    if (!category || typeof category !== 'string') {
        errors.push('category is required and must be a string');
    }

    if (!severity || typeof severity !== 'string') {
        errors.push('severity is required and must be a string');
    } else if (!VALID_SEVERITIES.includes(severity)) {
        errors.push(`severity must be one of: ${VALID_SEVERITIES.join(', ')}`);
    }

    if (!reportedBy || typeof reportedBy !== 'string') {
        errors.push('reportedBy is required and must be a string');
    }

    if (!team || typeof team !== 'string') {
        errors.push('team is required and must be a string');
    }

    if (!location || typeof location !== 'string') {
        errors.push('location is required and must be a string');
    }

    if (errors.length > 0) {
        return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    next();
};

module.exports = { validateUserPayload, validateIncidentPayload };
