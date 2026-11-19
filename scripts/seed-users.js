#!/usr/bin/env node
/**
 * Create or update an admin dashboard user.
 *
 * Usage:
 *   node scripts/seed-users.js <email> [office_admin|technical]
 *   node scripts/seed-users.js <email> <password> [office_admin|technical]
 *
 * When the role is given as the second argument, or the password is omitted,
 * the script prompts for the password on stdin (hidden) so it never appears in
 * argv or shell history.
 */
require('dotenv').config();

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../config/database');

const [, , email, arg2, arg3] = process.argv;
const ROLES = ['office_admin', 'technical'];

let password = null;
let role = 'office_admin';

if (ROLES.includes(arg2)) {
    role = arg2;                       // node seed-users.js <email> <role>
} else if (arg2 !== undefined) {
    password = arg2;                   // node seed-users.js <email> <password> [role]
    if (ROLES.includes(arg3)) role = arg3;
}

if (!email) {
    console.error('Usage: node scripts/seed-users.js <email> [office_admin|technical]');
    console.error('       node scripts/seed-users.js <email> <password> [office_admin|technical]');
    process.exit(1);
}

function promptPassword() {
    return new Promise((resolve) => {
        let value = '';
        process.stdout.write('Password (hidden): ');
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding('utf8');

        const onData = (char) => {
            switch (char) {
                case '\n':
                case '\r':
                case '\u0004':
                    process.stdin.removeListener('data', onData);
                    process.stdin.setRawMode(false);
                    process.stdin.pause();
                    process.stdout.write('\n');
                    resolve(value);
                    break;
                case '\u0003':
                    process.stdin.removeListener('data', onData);
                    process.stdin.setRawMode(false);
                    process.stdout.write('\n');
                    process.exit(130);
                    break;
                case '\u007f':
                case '\b':
                    if (value.length) {
                        value = value.slice(0, -1);
                        process.stdout.write('\b \b');
                    }
                    break;
                default:
                    if (char >= ' ' && char <= '~') {
                        value += char;
                        process.stdout.write('*');
                    }
                    break;
            }
        };

        process.stdin.on('data', onData);
    });
}

(async () => {
    let secret = password;
    if (!secret) {
        secret = await promptPassword();
    }
    if (!secret) {
        console.error('Password is required');
        process.exit(1);
    }

    const hash = bcrypt.hashSync(secret, 10);
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);

    if (existing) {
        db.prepare('UPDATE users SET password_hash = ?, role = ? WHERE id = ?')
            .run(hash, role, existing.id);
        console.log(`Updated user ${email} (role=${role})`);
    } else {
        const id = crypto.randomUUID();
        db.prepare('INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)')
            .run(id, email, hash, role);
        console.log(`Created user ${email} (role=${role})`);
    }

    process.exit(0);
})();

