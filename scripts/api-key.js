#!/usr/bin/env node
require('dotenv').config();
const ApiKey = require('../models/api-key');

const [,, command, ...args] = process.argv;

switch (command) {
    case 'generate':
        const name = args[0] || 'default';
        const key = ApiKey.generate(name);
        console.log(`\n⚠️  Save this key now - it cannot be retrieved later!\n`);
        console.log(`API Key for "${name}":`);
        console.log(`${key}\n`);
        break;

    case 'list':
        const keys = ApiKey.list();
        console.log('\nAPI Keys:');
        console.table(keys);
        break;

    case 'revoke':
        const id = parseInt(args[0]);
        if (!id) {
            console.error('Usage: api-key revoke <id>');
            process.exit(1);
        }
        ApiKey.revokeById(id);
        console.log(`API key ${id} revoked`);
        break;

    default:
        console.log(`
Usage: node scripts/api-key.js <command>

Commands:
  generate [name]  Generate a new API key (shown once!)
  list             List all API keys (by id, name)
  revoke <id>      Revoke an API key by id
        `);
}

process.exit(0);
