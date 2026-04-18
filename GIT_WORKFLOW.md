# Git Workflow & Deployment Guide

This guide explains how to manage LedgerX with Git and deploy changes to GitHub.

## 📋 Prerequisites

- **Git** installed and configured
- **GitHub account** with push access to the repository
- **SSH key** or **personal access token** (PAT) for authentication

## 🔧 Git Configuration

### Initial Setup

```bash
# Configure your Git identity (if not already done)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Verify configuration
git config --global --list
```

### Repository Status

```bash
# Check current branch and status
cd LedgerX
git status

# View commit history
git log --oneline -10

# Check remote URL
git remote -v
```

**Expected output:**
```
origin  https://github.com/GGWarrior001/LedgerX.git (fetch)
origin  https://github.com/GGWarrior001/LedgerX.git (push)
```

## 📥 Pulling Latest Changes

```bash
# Fetch latest changes from remote
git fetch origin

# Pull latest changes to your local main branch
git pull origin main

# Or if you're on a different branch
git pull origin <branch-name>
```

## ✅ Code Review & Validation

### 1. Check for Errors

```bash
# Lint all TypeScript/JavaScript files
bun run lint

# Fix auto-fixable linting issues
eslint . --fix
```

### 2. Run Tests

```bash
# Run unit tests
bun run test

# Run tests in watch mode (development)
bun run test:watch

# Run E2E tests
npx playwright test
```

### 3. Build & Verify

```bash
# Build for production
bun run build

# Preview production build
bun run preview
```

### 4. Type Check

```bash
# Check TypeScript compilation without emitting
npx tsc --noEmit
```

## 📝 Making Changes

### 1. Create a Feature Branch

```bash
# Branch off from main
git checkout main
git pull origin main

# Create feature branch (use descriptive names)
git checkout -b feature/description-of-change

# Examples:
# git checkout -b feature/add-budget-tracking
# git checkout -b fix/invoice-calculation-bug
# git checkout -b docs/update-readme
```

### 2. Make & Commit Changes

```bash
# Check what files changed
git status

# Stage specific files
git add src/components/MyComponent.tsx

# Or stage all changes
git add .

# View staged changes
git diff --cached

# Commit with descriptive message
git commit -m "Add new feature: budget tracking

- Implement budget CRUD operations
- Add budget alerts and notifications
- Include unit tests for budget calculations"
```

### 3. Push Changes

```bash
# Push branch to remote (first time)
git push -u origin feature/description-of-change

# Subsequent pushes to same branch
git push
```

## 🔄 Sync & Update Changes

### Before Pushing

Always sync with latest main to avoid conflicts:

```bash
# Fetch latest from remote
git fetch origin

# Rebase your branch on latest main
git rebase origin/main

# Or merge (less preferred, creates merge commits)
git merge origin/main

# If conflicts occur, resolve them manually:
# 1. Open conflicted files
# 2. Remove conflict markers
# 3. Stage resolved files: git add <file>
# 4. Continue rebase: git rebase --continue
```

### Updating Existing Branch

```bash
# Add more commits
git add .
git commit -m "Update: additional improvements"

# Force push if you've rebased (use with caution!)
git push --force-with-lease
```

## 🚀 Push to GitHub

### Standard Push

```bash
# After all changes are committed and tested
git push origin feature/description-of-change
```

### Create Pull Request

After pushing, create a PR on GitHub:

1. Go to [LedgerX repository](https://github.com/GGWarrior001/LedgerX)
2. Click "New Pull Request" or use GitHub's prompt
3. Select your branch as "compare" and "main" as "base"
4. Write descriptive PR title and description
5. Request reviewers if applicable
6. Submit PR

### PR Description Template

```markdown
## Description
Brief description of what this PR does.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Changes Made
- Detailed change 1
- Detailed change 2
- Detailed change 3

## Testing
How to test these changes:
1. Step 1
2. Step 2

## Checklist
- [x] Code follows style guidelines
- [x] Lint passes: `bun run lint`
- [x] Tests pass: `bun run test`
- [x] Build succeeds: `bun run build`
- [x] No breaking changes
```

## ✨ Recent Updates to README & Docs

### Updated Files

1. **README.md** - Enhanced with:
   - Better Getting Started section with clear port references
   - Added Contributing guidelines
   - Expanded Security Notes
   - Tips & Tricks for development
   - Roadmap section
   - Project Stats and Changelog
   - Learning Resources

2. **DEVELOPMENT.md** - New comprehensive guide:
   - Development setup instructions
   - Detailed project structure
   - Code standards and best practices
   - Testing guidelines
   - Debugging techniques
   - Common development tasks
   - Troubleshooting guide

3. **GIT_WORKFLOW.md** - This file:
   - Git configuration
   - Pulling/pushing workflow
   - Code review process
   - Branching strategy
   - PR creation guide

## 🔗 Useful Git Commands

### View History

```bash
# View recent commits
git log --oneline -5

# View commits for specific file
git log -- src/lib/storage.ts

# View detailed commit
git show <commit-hash>

# View branch history
git log <branch-name>
```

### Manage Branches

```bash
# List local branches
git branch

# List all branches (local + remote)
git branch -a

# Delete local branch
git branch -d feature/old-feature

# Delete remote branch
git push origin --delete feature/old-feature

# Rename branch
git branch -m old-name new-name
```

### Undo Changes

```bash
# Undo unstaged changes to file
git restore src/file.tsx

# Undo staged changes (keep file modifications)
git restore --staged src/file.tsx

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1

# Revert a specific commit (creates new commit)
git revert <commit-hash>
```

### Stash Changes

```bash
# Save work in progress
git stash

# View stashed changes
git stash list

# Apply stashed changes
git stash pop

# Apply specific stash
git stash apply stash@{0}

# Discard stash
git stash drop
```

## 🔐 Authentication

### Using SSH (Recommended)

1. Generate SSH key:
```bash
ssh-keygen -t ed25519 -C "your.email@example.com"
```

2. Add public key to GitHub:
   - Go to Settings → SSH and GPG keys
   - Click "New SSH key"
   - Paste public key content

3. Test connection:
```bash
ssh -T git@github.com
```

### Using HTTPS with Token

1. Create Personal Access Token:
   - Go to GitHub Settings → Developer settings → Personal access tokens
   - Click "Generate new token"
   - Select `repo` scope
   - Copy token

2. When pushing, use token as password:
```bash
git push origin main
# Username: your-github-username
# Password: paste-your-token-here
```

## 📊 Repository Statistics

```bash
# Count commits by author
git shortlog -s -n

# Count lines of code
git ls-files | xargs wc -l

# Show contributor stats
git log --format=%an --date=short --date-order | sort | uniq -c | sort -rn

# View code frequency
git log --all --numstat --format="%h" | awk '{print $1 "," $2 "," $3 "," $4}' | sort | uniq -c
```

## 🚨 Important Notes

### Before Pushing to Production

✅ **Always verify:**
- [ ] Lint passes: `bun run lint`
- [ ] Tests pass: `bun run test`
- [ ] Build succeeds: `bun run build`
- [ ] Type check passes: `npx tsc --noEmit`
- [ ] No `.env` file committed (check `.gitignore`)
- [ ] No secrets or credentials in code
- [ ] Changes are properly tested
- [ ] Documentation is updated

### Commit Message Standards

Good commit messages:
- ✅ `Add invoice email notification feature`
- ✅ `Fix: correct tax calculation bug in expenses`
- ✅ `Docs: update README with Firebase setup`
- ✅ `Refactor: simplify expense filtering logic`

Bad commit messages:
- ❌ `Update`
- ❌ `Fix bug`
- ❌ `Changes`
- ❌ `asdf`

## 🔍 Code Review Checklist

When reviewing changes:

- [ ] Code follows project style guidelines
- [ ] Changes are well-tested
- [ ] No sensitive data committed
- [ ] Documentation is updated
- [ ] Performance implications considered
- [ ] Breaking changes clearly documented
- [ ] Dependencies are appropriate
- [ ] Backward compatibility maintained

## 🆘 Common Git Issues

### Issue: "fatal: not a git repository"

```bash
# Navigate to repository root
cd LedgerX

# Verify .git directory exists
ls -la | grep .git
```

### Issue: "Your branch is ahead of origin/main"

```bash
# Push your changes
git push origin <branch-name>

# Or if force push needed (careful!)
git push --force-with-lease
```

### Issue: "Merge conflict"

```bash
# View conflicted files
git status

# Manually resolve in editor
# Look for <<<<<<, ======, >>>>>> markers

# After resolving
git add <resolved-file>
git commit -m "Resolve merge conflict"
```

### Issue: "Detached HEAD state"

```bash
# Return to main branch
git checkout main

# Or create new branch from current position
git checkout -b new-branch-name
```

## 📚 Learn More

- [Git Official Documentation](https://git-scm.com/doc)
- [GitHub Guides](https://guides.github.com/)
- [Atlassian Git Tutorials](https://www.atlassian.com/git/tutorials)
- [Pro Git Book](https://git-scm.com/book/en/v2)

---

**Last Updated:** April 2026

For the latest updates and information, visit the [LedgerX GitHub Repository](https://github.com/GGWarrior001/LedgerX).
