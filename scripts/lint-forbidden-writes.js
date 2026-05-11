#!/usr/bin/env node
// lint-forbidden-writes.js
// Guards against direct writes to projects.current_budget or projects.actual_spend
// from anywhere except the designated service and reconciliation job.
// Run via: node scripts/lint-forbidden-writes.js
// Wired into CI as a required check before typecheck and build.

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');

// Patterns that constitute a forbidden write
const FORBIDDEN_PATTERNS = [
  /UPDATE\s+projects[\s\S]{0,200}SET[\s\S]{0,200}(current_budget|actual_spend)/i,
  /\.update\(\s*\{[\s\S]{0,400}(current_budget|actual_spend)/,
  /projects\.(current_budget|actual_spend)\s*=/,
];

// Files/directories that are allowed to contain these patterns
const ALLOWED_PATHS = [
  /server[/\\]src[/\\]services[/\\]budget-snapshot-service\.ts$/,
  /server[/\\]src[/\\]jobs[/\\]budget-reconciliation\.ts$/,
  /supabase[/\\]migrations[/\\]/,
  /scripts[/\\]lint-forbidden-writes\.js$/,
  /server[/\\]src[/\\]__tests__[/\\]/,
  /node_modules[/\\]/,
];

// Directories to skip entirely
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  '.next',
  'coverage',
  'client/node_modules',
  'server/node_modules',
]);

// File extensions to check
const CHECK_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.sql']);

let violations = 0;
const checked = [];

function isAllowed(filePath) {
  const rel = filePath.replace(REPO_ROOT + path.sep, '').replace(REPO_ROOT + '/', '');
  return ALLOWED_PATHS.some((pattern) => pattern.test(rel.replace(/\\/g, '/')));
}

function shouldSkipDir(dirName) {
  return SKIP_DIRS.has(dirName) || dirName.startsWith('.');
}

function walk(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!shouldSkipDir(entry.name)) walk(full);
    } else if (entry.isFile() && CHECK_EXTENSIONS.has(path.extname(entry.name))) {
      checkFile(full);
    }
  }
}

function checkFile(filePath) {
  if (isAllowed(filePath)) return;

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return;
  }

  // Allow files that contain the opt-out comment
  if (content.includes('lint-forbidden-writes: allowed')) return;

  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(line)) {
        const rel = path.relative(REPO_ROOT, filePath);
        console.error(`\nFORBIDDEN WRITE at ${rel}:${i + 1}`);
        console.error(`  ${line.trim()}`);
        console.error('  Only budget-snapshot-service.ts and budget-reconciliation.ts may write to projects.current_budget or projects.actual_spend.');
        violations++;
        break;
      }
    }
  }
  checked.push(filePath);
}

walk(REPO_ROOT);

if (violations > 0) {
  console.error(`\n✗ lint-forbidden-writes: ${violations} violation(s) found.\n`);
  process.exit(1);
} else {
  console.log(`✓ lint-forbidden-writes: ${checked.length} files checked, 0 violations.\n`);
  process.exit(0);
}
