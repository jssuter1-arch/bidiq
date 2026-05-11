// Tests 5 and 6 from Phase 1 Quality Requirements:
// "The lint script fails CI when a file outside the allowed list contains a forbidden write pattern."
// "The lint script passes CI when only allowed files contain those patterns."

import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

const LINT_SCRIPT = path.resolve(__dirname, '../../../scripts/lint-forbidden-writes.js');
const REPO_ROOT = path.resolve(__dirname, '../../..');

describe('lint-forbidden-writes', () => {
  it('test 5: script exits 0 on the clean repo (no violations in non-allowed files)', () => {
    // The repo should be clean — no forbidden writes outside allowed paths
    let exitCode = 0;
    try {
      execSync(`node "${LINT_SCRIPT}"`, { cwd: REPO_ROOT, stdio: 'pipe' });
    } catch (err: any) {
      exitCode = err.status ?? 1;
    }
    expect(exitCode).toBe(0);
  });

  it('test 6: script exits 1 when a non-allowed file contains a forbidden write pattern', () => {
    // Write a temp file with a forbidden pattern into a scanned directory
    const tmpDir = path.join(REPO_ROOT, 'server', 'src');
    const tmpFile = path.join(tmpDir, '_test_forbidden_write_TEMP.ts');

    try {
      fs.writeFileSync(
        tmpFile,
        `// intentionally bad file for lint test\n` +
        `db.from('projects').update({ current_budget: 999 });\n`,
      );

      let exitCode = 0;
      try {
        execSync(`node "${LINT_SCRIPT}"`, { cwd: REPO_ROOT, stdio: 'pipe' });
      } catch (err: any) {
        exitCode = err.status ?? 1;
      }
      expect(exitCode).toBe(1);
    } finally {
      try { fs.unlinkSync(tmpFile); } catch { /* cleanup */ }
    }
  });

  it('test 6b: script allows opt-out comment in non-allowed files', () => {
    const tmpFile = path.join(REPO_ROOT, 'server', 'src', '_test_optout_TEMP.ts');

    try {
      fs.writeFileSync(
        tmpFile,
        `// lint-forbidden-writes: allowed\n` +
        `db.from('projects').update({ current_budget: 999 });\n`,
      );

      let exitCode = 0;
      try {
        execSync(`node "${LINT_SCRIPT}"`, { cwd: REPO_ROOT, stdio: 'pipe' });
      } catch (err: any) {
        exitCode = err.status ?? 1;
      }
      expect(exitCode).toBe(0);
    } finally {
      try { fs.unlinkSync(tmpFile); } catch { /* cleanup */ }
    }
  });
});
