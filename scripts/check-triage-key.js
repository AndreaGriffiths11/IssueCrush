#!/usr/bin/env node
// Diagnose TYPESAFE_API_KEY configuration without ever printing the key.
//
// Run with: npm run check:triage
//
// The failure modes are hard to tell apart from the app, because a missing key,
// a mangled key, and a rejected key all surface as "triage doesn't work". This
// separates them using the distinction TypeSafe's API actually makes:
//   403 "Must supply an API key!"  -> no key reached the server
//   401 "Cannot authenticate..."   -> key reached the server and was rejected
//   200                            -> key is valid

require('dotenv').config();

const MODELS_ENDPOINT = 'https://api.typesafe.ai/v1/models';
const REQUEST_TIMEOUT_MS = 20000;

function describeKeyShape(key) {
  const hasSurroundingWhitespace = key !== key.trim();
  const hasQuotes = /["']/.test(key);
  const looksLikePlaceholder = /your_|placeholder|<|>/i.test(key);

  console.log(`   length:      ${key.length}`);
  console.log(`   prefix:      ${JSON.stringify(key.slice(0, 8))}...`);
  console.log(`   whitespace:  ${hasSurroundingWhitespace ? 'YES — trim it' : 'clean'}`);
  console.log(`   quotes:      ${hasQuotes ? 'YES — strip them' : 'clean'}`);

  if (looksLikePlaceholder) {
    console.log('\n   The value still looks like the .env.example placeholder.');
  }
  if (hasSurroundingWhitespace || hasQuotes) {
    console.log('\n   Surrounding whitespace or quotes are usually a copy/paste artifact.');
  }
}

function reportMissingKey() {
  console.log('❌ TYPESAFE_API_KEY is not set in this environment.\n');
  console.log('   Local dev:  add it to .env  (cp .env.example .env)');
  console.log('   Deployed:   az staticwebapp appsettings set \\');
  console.log("                 --name issuecrush --resource-group issuecrush-rg \\");
  console.log("                 --setting-names 'TYPESAFE_API_KEY=<your-key>'\n");
  console.log('   Note: a GitHub Actions secret will NOT work. It only exists during');
  console.log('   the workflow run and never reaches the deployed Function.');
}

function explainStatus(status, message) {
  if (status === 200) {
    console.log('✅ Key is valid. Structured triage will work.');
    return 0;
  }

  if (status === 403) {
    console.log('❌ The server received no key at all.');
    console.log(`   API said: ${message}\n`);
    console.log('   The variable is set but arrived empty, which usually means the');
    console.log('   export happened in a different shell than the one running this.');
    return 1;
  }

  if (status === 401) {
    console.log('❌ The key reached TypeSafe and was rejected.');
    console.log(`   API said: ${message}\n`);
    console.log('   The request itself is correct, so this is the key or the account:');
    console.log('     - compare the length above against the TypeSafe console');
    console.log('     - check the key is activated and billing is set up');
    console.log('     - confirm it belongs to the right project');
    return 1;
  }

  if (status === 429) {
    console.log('⚠️  Rate limited. The key is being read; try again shortly.');
    return 1;
  }

  console.log(`❌ Unexpected status ${status}: ${message}`);
  return 1;
}

async function main() {
  console.log('\nChecking TYPESAFE_API_KEY...\n');

  const key = process.env.TYPESAFE_API_KEY;
  if (!key) {
    reportMissingKey();
    process.exit(1);
  }

  describeKeyShape(key);
  console.log(`\n   calling ${MODELS_ENDPOINT} ...\n`);

  let response;
  try {
    response = await fetch(MODELS_ENDPOINT, {
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    const isTimeout = error.name === 'TimeoutError' || error.name === 'AbortError';
    const reason = isTimeout ? 'request timed out' : error.message;
    console.log(`❌ Could not reach TypeSafe: ${reason}`);
    process.exit(1);
  }

  const body = await response.json().catch(() => ({}));
  const message = body?.detail?.message || body?.message || body?.error || '(no message)';

  const exitCode = explainStatus(response.status, message);
  console.log('');
  process.exit(exitCode);
}

main();
