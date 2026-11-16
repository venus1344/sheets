/**
 * Role guard for admin API routes.
 *
 * Usage:
 *   router.get('/secret', requireRole('technical'), handler)
 *   router.get('/shared', requireRole('office_admin', 'technical'), handler)
 */
function requireRole(...roles) {
    return (req, res, next) => {
        const user = req.session && req.session.user;

        if (!user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        if (roles.length && !roles.includes(user.role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        return next();
    };
}

module.exports = { requireRole };
