# Commit Commands - Custom Instructions

## PR Title Rules

### dev → main PR
**CRITICAL**: When creating a PR from `dev` branch to `main` branch, you MUST follow these rules:

1. **Title**: Always use exactly: `merge dev into main`
2. **Body**: Put all the detailed information, summary, and test plan in the PR body

**Example**:
```bash
gh pr create --title "merge dev into main" --body "..." --base main
```

### Other PRs
For all other PRs (feature branches, etc.), use descriptive titles as usual following the project's commit message format from CLAUDE.md.

## Implementation

When executing `/commit-push-pr` or creating PRs:

1. Check the current branch name
2. Check the target base branch
3. If current branch is `dev` AND base branch is `main`:
   - Set title to: `merge dev into main`
   - Put all commit summaries and details in the body
4. Otherwise:
   - Use normal descriptive title from commit message
   - Use normal body format
