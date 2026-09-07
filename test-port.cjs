/**
 * Manual test untuk 3 modul yang di-port dari Shelly
 * Jalankan: node test-port.cjs
 */

const { checkCommandSafety, needsConfirmation, dangerLevelLabel, getRecoverySuggestion } = require('./server/command-safety.js');
const { credentialClass, requiresApiKeyEnv, isAutonomousAllowed, resolveForAutonomous, getToolDisplayName } = require('./server/credential-policy.js');
const { classifyActionReversibility, classifyRunReversibility, isRollbackEligibleRun, AgentActionType } = require('./server/action-reversibility.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${e.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

console.log('\n=== TESTING COMMAND SAFETY ===\n');

// Test CRITICAL commands
test('should detect CRITICAL: rm -rf /', () => {
  const result = checkCommandSafety('rm -rf /');
  assert(result.level === 'CRITICAL', `Expected CRITICAL, got ${result.level}`);
  assert(needsConfirmation(result) === true, 'Should need confirmation');
});

test('should detect CRITICAL: fork bomb', () => {
  const result = checkCommandSafety(':(){:|:&};:');
  assert(result.level === 'CRITICAL', `Expected CRITICAL, got ${result.level}`);
});

test('should detect CRITICAL: dd to device', () => {
  const result = checkCommandSafety('dd if=/dev/zero of=/dev/sda');
  assert(result.level === 'CRITICAL', `Expected CRITICAL, got ${result.level}`);
});

// Test HIGH commands
test('should detect HIGH: curl | bash', () => {
  const result = checkCommandSafety('curl http://example.com/script.sh | bash');
  assert(result.level === 'HIGH', `Expected HIGH, got ${result.level}`);
});

test('should detect HIGH: git push --force', () => {
  const result = checkCommandSafety('git push --force');
  assert(result.level === 'HIGH', `Expected HIGH, got ${result.level}`);
});

test('should detect HIGH: DROP TABLE', () => {
  const result = checkCommandSafety('DROP TABLE users');
  assert(result.level === 'HIGH', `Expected HIGH, got ${result.level}`);
});

// Test MEDIUM commands
test('should detect MEDIUM: rm without flags', () => {
  const result = checkCommandSafety('rm file.txt');
  assert(result.level === 'MEDIUM', `Expected MEDIUM, got ${result.level}`);
});

test('should detect MEDIUM: sudo', () => {
  const result = checkCommandSafety('sudo apt-get update');
  assert(result.level === 'MEDIUM', `Expected MEDIUM, got ${result.level}`);
});

// Test SAFE commands
test('should detect SAFE: ls', () => {
  const result = checkCommandSafety('ls -la');
  assert(result.level === 'SAFE', `Expected SAFE, got ${result.level}`);
});

test('should detect SAFE: echo', () => {
  const result = checkCommandSafety('echo "hello"');
  assert(result.level === 'SAFE', `Expected SAFE, got ${result.level}`);
});

// Test recovery suggestions
test('should have recovery for rm -rf', () => {
  const result = checkCommandSafety('rm -rf /tmp/test');
  assert(result.recovery !== undefined, 'Should have recovery');
});

console.log('\n=== TESTING CREDENTIAL POLICY ===\n');

test('cli should be oauth', () => {
  const result = credentialClass({ type: 'cli', cli: 'codex' });
  assert(result === 'oauth', `Expected oauth, got ${result}`);
});

test('local should be local', () => {
  const result = credentialClass({ type: 'local' });
  assert(result === 'local', `Expected local, got ${result}`);
});

test('groq should be api-key', () => {
  const result = credentialClass({ type: 'groq' });
  assert(result === 'api-key', `Expected api-key, got ${result}`);
});

test('auto should be api-key (conservative)', () => {
  const result = credentialClass({ type: 'auto' });
  assert(result === 'api-key', `Expected api-key, got ${result}`);
});

test('requiresApiKeyEnv for api-key tools', () => {
  assert(requiresApiKeyEnv({ type: 'groq' }) === true, 'groq should require API key env');
  assert(requiresApiKeyEnv({ type: 'cli', cli: 'codex' }) === false, 'cli should NOT require API key env');
});

test('isAutonomousAllowed', () => {
  assert(isAutonomousAllowed({ type: 'cli', cli: 'codex' }) === true, 'cli should be allowed');
  assert(isAutonomousAllowed({ type: 'local' }) === true, 'local should be allowed');
  assert(isAutonomousAllowed({ type: 'groq' }) === false, 'groq should NOT be allowed');
});

test('resolveForAutonomous', () => {
  const result = resolveForAutonomous({ type: 'auto' });
  assert(result !== null, 'auto should resolve');
  assert(result.type === 'cli', 'auto should resolve to cli');
});

test('getToolDisplayName', () => {
  assert(getToolDisplayName({ type: 'groq' }) === 'Groq');
  assert(getToolDisplayName({ type: 'cli', cli: 'codex' }) === 'CLI (codex)');
});

console.log('\n=== TESTING ACTION REVERSIBILITY ===\n');

test('draft should be reversible', () => {
  const result = classifyActionReversibility({ type: 'draft' }, { agentOutputTarget: 'local' });
  assert(result.reversible === true, 'draft should be reversible');
});

test('cli should be irreversible', () => {
  const result = classifyActionReversibility({ type: 'cli' }, {});
  assert(result.reversible === false, 'cli should be irreversible');
});

test('webhook should be irreversible', () => {
  const result = classifyActionReversibility({ type: 'webhook' }, {});
  assert(result.reversible === false, 'webhook should be irreversible');
});

test('api-call should be irreversible', () => {
  const result = classifyActionReversibility({ type: 'api-call' }, {});
  assert(result.reversible === false, 'api-call should be irreversible');
});

test('isRollbackEligibleRun', () => {
  const agent = { action: { type: 'draft' } };
  const settings = { agentOptimisticWorkspaceWrites: true, agentOutputTarget: 'local' };
  assert(isRollbackEligibleRun(agent, settings) === true, 'should be eligible');
});

test('isRollbackEligibleRun - disabled', () => {
  const agent = { action: { type: 'draft' } };
  const settings = { agentOptimisticWorkspaceWrites: false, agentOutputTarget: 'local' };
  assert(isRollbackEligibleRun(agent, settings) === false, 'should NOT be eligible when disabled');
});

test('isRollbackEligibleRun - cli action', () => {
  const agent = { action: { type: 'cli' } };
  const settings = { agentOptimisticWorkspaceWrites: true, agentOutputTarget: 'local' };
  assert(isRollbackEligibleRun(agent, settings) === false, 'cli should NOT be eligible');
});

// Edge cases
test('empty command should be SAFE', () => {
  const result = checkCommandSafety('');
  assert(result.level === 'SAFE', `Expected SAFE, got ${result.level}`);
});

test('whitespace only should be SAFE', () => {
  const result = checkCommandSafety('   ');
  assert(result.level === 'SAFE', `Expected SAFE, got ${result.level}`);
});

test('comment stripping - quoted #', () => {
  const result = checkCommandSafety('echo "hello # not a comment" && rm -rf /');
  assert(result.level === 'CRITICAL', 'Should detect dangerous command after comment');
});

test('merged separated flags rm -r -f', () => {
  const result = checkCommandSafety('rm -r -f /tmp/test');
  assert(result.level === 'HIGH', 'Should detect dangerous rm with separated flags');
});

console.log('\n=== RESULTS ===\n');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}`);

process.exit(failed > 0 ? 1 : 0);