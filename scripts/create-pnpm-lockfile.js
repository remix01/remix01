#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Create a minimal pnpm-lock.yaml file that will force pnpm to do a fresh install
// This is necessary because we deleted the previous lockfile
const lockfileContent = `lockfileVersion: '9.0'

settings:
  autoInstallPeers: true
  excludeLinksFromLockfile: false
`;

const lockfilePath = path.join(__dirname, '..', 'pnpm-lock.yaml');
fs.writeFileSync(lockfilePath, lockfileContent, 'utf-8');
console.log('✓ Created minimal pnpm-lock.yaml');
