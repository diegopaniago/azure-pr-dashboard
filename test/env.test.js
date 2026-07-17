import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadDotEnv } from '../src/env.js';

test('loadDotEnv sobrescreve variáveis herdadas com valores do arquivo local', () => {
  const originalValue = process.env.AZURE_DEVOPS_PAT;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'azure-pr-dashboard-'));
  const envPath = path.join(tempDir, '.env');

  fs.writeFileSync(envPath, [
    'AZURE_DEVOPS_PAT=from-file',
    'AZURE_DEVOPS_ORG=\"solucoesdigix\"'
  ].join('\n'));

  try {
    process.env.AZURE_DEVOPS_PAT = 'from-shell';

    loadDotEnv(envPath);

    assert.equal(process.env.AZURE_DEVOPS_PAT, 'from-file');
    assert.equal(process.env.AZURE_DEVOPS_ORG, 'solucoesdigix');
  } finally {
    if (originalValue === undefined) {
      delete process.env.AZURE_DEVOPS_PAT;
    } else {
      process.env.AZURE_DEVOPS_PAT = originalValue;
    }

    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
