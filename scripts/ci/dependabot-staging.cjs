function eligible(pull, repo, base) {
  return pull.state === 'open' && pull.user.login === 'dependabot[bot]' &&
    pull.user.type === 'Bot' && pull.head.repo?.full_name === `${repo.owner}/${repo.repo}` &&
    pull.base.ref === base;
}

function pullNumber(value) {
  if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value))) {
    throw new Error('Invalid pull request number');
  }
  return Number(value);
}

async function routePullRequest(github, repo, number, defaultBranch) {
  const pull_number = pullNumber(number);
  const { data: pull } = await github.rest.pulls.get({ ...repo, pull_number });
  if (!eligible(pull, repo, defaultBranch) || defaultBranch === 'staging') return;
  await github.rest.pulls.update({ ...repo, pull_number, base: 'staging' });
  await github.rest.actions.createWorkflowDispatch({ ...repo,
    workflow_id: 'dependabot-staging-ci.yml', ref: defaultBranch,
    inputs: { pull_request: String(pull_number) } });
}

async function prepareValidation(github, repo, number,
  wait = ms => new Promise(resolve => setTimeout(resolve, ms))) {
  const pull_number = pullNumber(number);
  for (let attempt = 0; attempt < 10; attempt++) {
    const { data: pull } = await github.rest.pulls.get({ ...repo, pull_number });
    if (!eligible(pull, repo, 'staging')) throw new Error('PR is not eligible for staging validation');
    if (pull.mergeable === false) throw new Error('PR has merge conflicts with staging');
    if (pull.mergeable === true && pull.merge_commit_sha) {
      const { data: commit } = await github.rest.repos.getCommit({ ...repo, ref: pull.merge_commit_sha });
      if (commit.parents.length === 2 && commit.parents[0].sha === pull.base.sha &&
          commit.parents[1].sha === pull.head.sha) {
        return { head: pull.head.sha, base: pull.base.sha, merge: pull.merge_commit_sha };
      }
    }
    if (attempt < 9) await wait(2000);
  }
  throw new Error('GitHub has not produced a current merge commit; rerun validation');
}

module.exports = { eligible, routePullRequest, prepareValidation };
