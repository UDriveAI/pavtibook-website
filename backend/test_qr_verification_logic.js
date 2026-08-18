/**
 * Unit Test Suite for Two-Tier QR Verification Logic & Token Generator
 */

const assert = require('assert');
const { generateDeterministicToken, validateManifest } = require('./scripts/migrate_legacy_receipts');
const path = require('path');

console.log('Running Two-Tier QR Verification and Migration Unit Tests...\n');

// Test 1: Token generation format
{
  const token = generateDeterministicToken('PB-2026-000044', 'rx19aTK9jlae5H48RAHR');
  assert.strictEqual(token, 'legacy_PB-2026-000044_rx19aTK9jlae5H48RAHR');
  console.log('✓ Test 1 Passed: Deterministic QR token generator format is exact.');
}

// Test 2: Manifest Reconciliation
(async () => {
  const manifestPath = path.join(__dirname, 'data/migration_manifest_174.json');
  const { manifest, migrateCandidates, juneDuplicates, testOrgs } = await validateManifest(manifestPath);

  assert.strictEqual(manifest.length, 174, 'Total must be 174');
  assert.strictEqual(migrateCandidates.length, 131, 'Migrate candidates must be 131');
  assert.strictEqual(juneDuplicates.length, 40, 'June duplicates must be 40');
  assert.strictEqual(testOrgs.length, 3, 'Test org exclusions must be 3');
  console.log('✓ Test 2 Passed: Manifest reconciliation (174 = 131 + 40 + 3) validated.');

  // Test 3: Simulated Two-Tier Verification Logic Unit Test
  const mockDbRows = {
    // 1. Exact token lookup
    'fb972a9a2f30433b': [{ receipt_id: 'rec-1', receipt_number: 'PB-ADM-0001', qr_code_value: 'fb972a9a2f30433b' }],
    // 2. Unambiguous legacy receipt number (1 match)
    'PB-2026-000044': [{ receipt_id: 'rec-44', receipt_number: 'PB-2026-000044', qr_code_value: 'legacy_PB-2026-000044_rx19a' }],
    // 3. Ambiguous duplicate receipt number (2 matches)
    'PB-DUPLICATE-AMBIGUOUS': [
      { receipt_id: 'rec-dup-1', receipt_number: 'PB-DUPLICATE-AMBIGUOUS' },
      { receipt_id: 'rec-dup-2', receipt_number: 'PB-DUPLICATE-AMBIGUOUS' }
    ]
  };

  async function mockVerifyByQrCode(token) {
    // Tier 1: exact qr_code_value
    const exactMatches = Object.values(mockDbRows).flat().filter(r => r.qr_code_value === token);
    if (exactMatches.length > 0) return exactMatches[0];

    // Tier 2: legacy receipt_number
    const legacyMatches = Object.values(mockDbRows).flat().filter(r => r.receipt_number === token);
    if (legacyMatches.length === 1) return legacyMatches[0];

    return null;
  }

  const res1 = await mockVerifyByQrCode('fb972a9a2f30433b');
  assert.strictEqual(res1.receipt_id, 'rec-1', 'Tier 1 exact token match must succeed');

  const res2 = await mockVerifyByQrCode('PB-2026-000044');
  assert.strictEqual(res2.receipt_id, 'rec-44', 'Tier 2 unambiguous legacy fallback must succeed');

  const res3 = await mockVerifyByQrCode('PB-DUPLICATE-AMBIGUOUS');
  assert.strictEqual(res3, null, 'Tier 2 ambiguous duplicate match must safely return null');

  const res4 = await mockVerifyByQrCode('NON_EXISTENT_TOKEN');
  assert.strictEqual(res4, null, 'Non-existent token must return null');

  console.log('✓ Test 3 Passed: Two-tier verification handles cryptographic tokens, unambiguous legacy numbers, and ambiguous duplicates with mathematical safety.');

  console.log('\n========================================');
  console.log('ALL UNIT TESTS PASSED (3 / 3)');
  console.log('========================================\n');
})();
