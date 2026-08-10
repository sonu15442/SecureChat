/**
 * SecureChat Baseline / Load Test
 * ─────────────────────────────────
 * Simulates 100 concurrent virtual users hitting the mock API
 * continuously for 60 seconds.
 *
 * Uses `autocannon` – a fast HTTP benchmarking tool.
 *
 * Metrics reported:
 *   • Requests per second (RPS)
 *   • Latency (avg / min / max / p50 / p99)
 *   • Total requests & throughput
 *   • Per-endpoint breakdown
 */

import autocannon from 'autocannon';

const BASE_URL = process.env.BACKEND_URL || 'https://securechat-ioe9.onrender.com';

// ── Configuration ───────────────────────────────────────────────────
const DURATION_SECONDS = 60;   // 1 minute
const CONNECTIONS       = 100; // 100 virtual users

// ── Helper ──────────────────────────────────────────────────────────

function printHeader(text) {
  const line = '─'.repeat(60);
  console.log(`\n${line}`);
  console.log(`  ${text}`);
  console.log(line);
}

function printLatency(label, stat) {
  console.log(`  ${label}`);
  console.log(`    Average  : ${stat.average} ms`);
  console.log(`    Min      : ${stat.min} ms`);
  console.log(`    Max      : ${stat.max} ms`);
  console.log(`    p50      : ${stat.p50} ms`);
  console.log(`    p99      : ${stat.p99} ms`);
  console.log(`    Std Dev  : ${stat.stddev} ms`);
}

function printResult(title, result) {
  printHeader(title);
  console.log(`  Duration        : ${result.duration} s`);
  console.log(`  Connections     : ${result.connections}`);
  console.log(`  Total Requests  : ${result.requests.total}`);
  console.log(`  Requests/sec    : ${result.requests.average} req/sec`);
  console.log(`  Throughput      : ${(result.throughput.average / 1024).toFixed(1)} KB/sec`);
  console.log(`  Errors          : ${result.errors}`);
  console.log(`  Timeouts        : ${result.timeouts}`);
  console.log(`  Non-2xx Resp    : ${result.non2xx}`);
  printLatency('Latency', result.latency);
  console.log('');
}

// ── Individual Endpoint Tests ───────────────────────────────────────

async function runTest(config) {
  return new Promise((resolve, reject) => {
    const instance = autocannon(config, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    autocannon.track(instance, { renderProgressBar: true });
  });
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║     SecureChat — Baseline / Load Test Suite                 ║');
  console.log('║     100 virtual users │ 60 seconds │ 5 endpoints            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const allResults = [];

  // ── 1. Health Check (GET) ─────────────────────────────────────────
  console.log('\n🩺  Test 1/5 — GET /api/health');
  const healthResult = await runTest({
    url: `${BASE_URL}/api/health`,
    connections: CONNECTIONS,
    duration: DURATION_SECONDS,
    method: 'GET',
  });
  printResult('GET /api/health', healthResult);
  allResults.push({ endpoint: 'GET /api/health', result: healthResult });

  // ── 2. Login (POST) ───────────────────────────────────────────────
  console.log('\n🔐  Test 2/5 — POST /api/auth/login');
  const loginResult = await runTest({
    url: `${BASE_URL}/api/auth/login`,
    connections: CONNECTIONS,
    duration: DURATION_SECONDS,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'alice', password: 'password123' }),
  });
  printResult('POST /api/auth/login', loginResult);
  allResults.push({ endpoint: 'POST /api/auth/login', result: loginResult });

  // ── 3. Get Contacts (GET) ─────────────────────────────────────────
  console.log('\n📋  Test 3/5 — GET /api/contacts');
  const contactsResult = await runTest({
    url: `${BASE_URL}/api/contacts`,
    connections: CONNECTIONS,
    duration: DURATION_SECONDS,
    method: 'GET',
  });
  printResult('GET /api/contacts', contactsResult);
  allResults.push({ endpoint: 'GET /api/contacts', result: contactsResult });

  // ── 4. Send Message (POST) ────────────────────────────────────────
  console.log('\n✉️   Test 4/5 — POST /api/messages/send');
  const sendResult = await runTest({
    url: `${BASE_URL}/api/messages/send`,
    connections: CONNECTIONS,
    duration: DURATION_SECONDS,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contactId: 'contact_1',
      text: 'Hey SecureBot, check this link: https://github.com/openai',
    }),
  });
  printResult('POST /api/messages/send', sendResult);
  allResults.push({ endpoint: 'POST /api/messages/send', result: sendResult });

  // ── 5. Link Analysis (POST) ───────────────────────────────────────
  console.log('\n🔍  Test 5/5 — POST /api/link-analysis');
  const analysisResult = await runTest({
    url: `${BASE_URL}/api/link-analysis`,
    connections: CONNECTIONS,
    duration: DURATION_SECONDS,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'http://free-crypto-giveaway.xyz/claim-prize' }),
  });
  printResult('POST /api/link-analysis', analysisResult);
  allResults.push({ endpoint: 'POST /api/link-analysis', result: analysisResult });

  // ── Summary ───────────────────────────────────────────────────────
  printHeader('📊  COMBINED SUMMARY');
  console.log('');
  console.log(
    '  Endpoint'.padEnd(35) +
    'RPS'.padStart(10) +
    'Avg(ms)'.padStart(10) +
    'Min(ms)'.padStart(10) +
    'Max(ms)'.padStart(10) +
    'p99(ms)'.padStart(10) +
    'Errors'.padStart(10)
  );
  console.log('  ' + '─'.repeat(93));

  let totalRequests = 0;
  let totalErrors = 0;

  for (const { endpoint, result } of allResults) {
    totalRequests += result.requests.total;
    totalErrors += result.errors;
    console.log(
      `  ${endpoint.padEnd(33)}` +
      `${result.requests.average}`.padStart(10) +
      `${result.latency.average}`.padStart(10) +
      `${result.latency.min}`.padStart(10) +
      `${result.latency.max}`.padStart(10) +
      `${result.latency.p99}`.padStart(10) +
      `${result.errors}`.padStart(10)
    );
  }

  console.log('  ' + '─'.repeat(93));
  console.log(`\n  Grand Total Requests : ${totalRequests.toLocaleString()}`);
  console.log(`  Grand Total Errors   : ${totalErrors.toLocaleString()}`);
  console.log(`  Test Duration        : ${DURATION_SECONDS}s per endpoint × ${allResults.length} endpoints = ${DURATION_SECONDS * allResults.length}s total`);
  console.log(`  Virtual Users        : ${CONNECTIONS}`);
  console.log('');
}

main().catch(err => {
  console.error('Load test failed:', err);
  process.exit(1);
});
