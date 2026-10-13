const { test } = require('node:test');
const assert = require('node:assert/strict');
const { routePullRequest, prepareValidation } = require('./dependabot-staging.cjs');
const repo = { owner: 'owner', repo: 'repo' };
const pull = { number: 1, state: 'open', user: { login: 'dependabot[bot]', type: 'Bot' },
  head: { sha: 'head', repo: { full_name: 'owner/repo' } },
  base: { ref: 'main', sha: 'base' }, mergeable: true, merge_commit_sha: 'merge' };
function fixture(overrides = {}) {
  const data = { ...pull, ...overrides };
  const calls = [];
  const github = { rest: {
    pulls: { get: async () => ({ data }), update: async args => calls.push(['update', args]) },
    actions: { createWorkflowDispatch: async args => calls.push(['dispatch', args]) },
    repos: { getCommit: async () => ({ data: { parents: [{ sha: 'base' }, { sha: 'head' }] } }),
      createCommitStatus: async args => calls.push(['status', args]) }
  } };
  return { github, calls };
}
test('routes Dependabot main PR then explicitly dispatches staging CI', async () => {
  const { github, calls } = fixture();
  await routePullRequest(github, repo, 1, 'main');
  assert.deepEqual(calls.map(([name]) => name), ['update', 'dispatch']);
  assert.equal(calls[0][1].base, 'staging');
  assert.equal(calls[1][1].ref, 'main');
  assert.deepEqual(calls[1][1].inputs, { pull_request: '1' });
});
for (const [name, overrides] of [
  ['human', { user: { login: 'user', type: 'User' } }],
  ['fork', { head: { repo: { full_name: 'other/repo' } } }],
  ['closed', { state: 'closed' }], ['staging', { base: { ref: 'staging' } }]
]) test(`does not route ${name} PR`, async () => {
  const { github, calls } = fixture(overrides);
  await routePullRequest(github, repo, 1, 'main');
  assert.equal(calls.length, 0);
});
test('captures only verified staging merge commit', async () => {
  const { github } = fixture({ base: { ref: 'staging', sha: 'base' } });
  assert.deepEqual(await prepareValidation(github, repo, 1),
    { head: 'head', base: 'base', merge: 'merge' });
});
test('rejects invalid PR number before calling APIs', async () => {
  await assert.rejects(prepareValidation({}, repo, '1; invalid'), /number/);
});
test('rejects conflicting staging PR', async () => {
  const { github } = fixture({ base: { ref: 'staging' }, mergeable: false });
  await assert.rejects(prepareValidation(github, repo, 1), /conflicts/);
});
test('rejects validation of main and fork PRs', async () => {
  for (const overrides of [{}, { base: { ref: 'staging' },
    head: { repo: { full_name: 'other/repo' } } }]) {
    await assert.rejects(prepareValidation(fixture(overrides).github, repo, 1), /eligible/);
  }
});
test('rejects stale merge commit even if API reports mergeable', async () => {
  const { github } = fixture({ base: { ref: 'staging', sha: 'new-base' } });
  await assert.rejects(prepareValidation(github, repo, 1, async () => {}), /current merge/);
});
