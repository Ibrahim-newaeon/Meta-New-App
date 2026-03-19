#!/usr/bin/env node
// scripts/import-n8n-workflows.mjs
// Run after n8n is up: node scripts/import-n8n-workflows.mjs

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const N8N_URL = process.env.N8N_WEBHOOK_URL ?? 'http://localhost:5678';
const N8N_USER = process.env.N8N_USER ?? 'admin';
const N8N_PASSWORD = process.env.N8N_PASSWORD ?? '';

const WORKFLOWS_DIR = join(__dirname, '../apps/n8n-workflows');
const AUTH = Buffer.from(`${N8N_USER}:${N8N_PASSWORD}`).toString('base64');

async function importWorkflow(filePath, fileName) {
  const workflow = JSON.parse(readFileSync(filePath, 'utf8'));

  // Check if workflow exists
  const listRes = await fetch(`${N8N_URL}/api/v1/workflows?name=${encodeURIComponent(workflow.name)}`, {
    headers: { Authorization: `Basic ${AUTH}`, 'Content-Type': 'application/json' },
  });
  const list = await listRes.json();
  const existing = list.data?.find(w => w.name === workflow.name);

  if (existing) {
    console.log(`  ↻ Updating: ${workflow.name}`);
    const res = await fetch(`${N8N_URL}/api/v1/workflows/${existing.id}`, {
      method: 'PUT',
      headers: { Authorization: `Basic ${AUTH}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...workflow, id: existing.id }),
    });
    const data = await res.json();
    console.log(`  ✓ Updated: ${data.name} (id: ${data.id})`);
  } else {
    console.log(`  + Creating: ${workflow.name}`);
    const res = await fetch(`${N8N_URL}/api/v1/workflows`, {
      method: 'POST',
      headers: { Authorization: `Basic ${AUTH}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(workflow),
    });
    const data = await res.json();
    console.log(`  ✓ Created: ${data.name} (id: ${data.id})`);
    console.log(`  ⚠  Remember to ACTIVATE the workflow in n8n UI`);
  }
}

async function main() {
  console.log(`\nal-ai.ai — n8n Workflow Importer`);
  console.log(`Target: ${N8N_URL}\n`);

  const files = readdirSync(WORKFLOWS_DIR)
    .filter(f => f.endsWith('.json'))
    .sort();

  for (const file of files) {
    await importWorkflow(join(WORKFLOWS_DIR, file), file);
  }

  console.log(`\nDone. ${files.length} workflows processed.`);
  console.log(`\nNext steps:`);
  console.log(`  1. Open n8n at ${N8N_URL}`);
  console.log(`  2. Review each workflow`);
  console.log(`  3. Add credentials: META_ACCESS_TOKEN, ANTHROPIC_API_KEY, SLACK_WEBHOOK_URL`);
  console.log(`  4. Activate workflows manually (n8n API cannot auto-activate)`);
}

main().catch(err => {
  console.error('Import failed:', err.message);
  process.exit(1);
});
