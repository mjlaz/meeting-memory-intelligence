# GitHub Setup Guide for Bob-a-thon Submission

**Last Updated**: February 6, 2026  
**Project**: Meeting Memory Intelligence Engine

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Initialize Git Repository

```bash
# Navigate to project directory (if not already there)
cd /Users/javielazaro/Desktop/meeting-memory-intel-regenerated

# Initialize git
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Meeting Memory Intelligence Engine for Bob-a-thon"
```

### Step 2: Create GitHub Repository

1. **Go to GitHub**: https://github.com/new
2. **Repository Name**: `meeting-memory-intelligence` (or your preferred name)
3. **Description**: "AI-powered meeting intelligence engine using IBM watsonx.ai - Bob-a-thon 2026 Submission"
4. **Visibility**: Choose Public or Private
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. **Click**: "Create repository"

### Step 3: Connect and Push to GitHub

After creating the repository, GitHub will show you commands. Use these:

```bash
# Add remote repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/meeting-memory-intelligence.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

---

## 📋 Detailed Step-by-Step Instructions

### Prerequisites

1. **Git Installed**: Check with `git --version`
   - If not installed: https://git-scm.com/downloads

2. **GitHub Account**: Create at https://github.com/signup
   - Free account is sufficient

3. **GitHub Authentication**: Choose one:
   - **Personal Access Token** (Recommended)
   - **SSH Key**
   - **GitHub CLI**

---

## 🔐 Setting Up GitHub Authentication

### Option 1: Personal Access Token (Easiest)

1. **Go to GitHub Settings**:
   - Click your profile picture → Settings
   - Scroll down to "Developer settings"
   - Click "Personal access tokens" → "Tokens (classic)"

2. **Generate New Token**:
   - Click "Generate new token (classic)"
   - Note: "Bob-a-thon submission token"
   - Expiration: 90 days
   - Select scopes:
     - ✅ `repo` (Full control of private repositories)
   - Click "Generate token"

3. **Copy Token**: Save it somewhere safe (you won't see it again!)

4. **Use Token When Pushing**:
   ```bash
   # When prompted for password, paste your token
   git push -u origin main
   Username: YOUR_GITHUB_USERNAME
   Password: YOUR_PERSONAL_ACCESS_TOKEN
   ```

### Option 2: SSH Key (More Secure)

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your_email@example.com"

# Start SSH agent
eval "$(ssh-agent -s)"

# Add SSH key
ssh-add ~/.ssh/id_ed25519

# Copy public key
cat ~/.ssh/id_ed25519.pub
# Copy the output

# Add to GitHub:
# Settings → SSH and GPG keys → New SSH key
# Paste the key and save

# Use SSH URL instead
git remote add origin git@github.com:YOUR_USERNAME/meeting-memory-intelligence.git
```

### Option 3: GitHub CLI (Simplest)

```bash
# Install GitHub CLI
brew install gh  # macOS
# or download from: https://cli.github.com/

# Authenticate
gh auth login

# Create and push repository
gh repo create meeting-memory-intelligence --public --source=. --remote=origin --push
```

---

## 📝 Complete Setup Commands

### Full Command Sequence

```bash
# 1. Navigate to project directory
cd /Users/javielazaro/Desktop/meeting-memory-intel-regenerated

# 2. Initialize git (if not done)
git init

# 3. Configure git (if first time)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# 4. Check what will be committed
git status

# 5. Add all files
git add .

# 6. Create initial commit
git commit -m "Initial commit: Meeting Memory Intelligence Engine for Bob-a-thon

- Complete application with landing page and dashboard
- 50+ API endpoints with IBM watsonx.ai integration
- Comprehensive documentation (8000+ lines)
- Tests: 46/48 passing (95.8%)
- Docker and deployment ready
- IBM Cloud Object Storage integration
- IBM Watson Speech-to-Text integration"

# 7. Add remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/meeting-memory-intelligence.git

# 8. Rename branch to main
git branch -M main

# 9. Push to GitHub
git push -u origin main
```

---

## ✅ Verification Checklist

After pushing, verify on GitHub:

- [ ] All files are visible in the repository
- [ ] README.md displays correctly on the main page
- [ ] Documentation files are accessible
- [ ] .env file is NOT in the repository (should be in .gitignore)
- [ ] api/data/*.db files are NOT in the repository
- [ ] node_modules/ is NOT in the repository

---

## 🎯 Repository Settings (Optional but Recommended)

### 1. Add Repository Description

On GitHub repository page:
- Click "⚙️ Settings"
- Add description: "AI-powered meeting intelligence engine using IBM watsonx.ai - Bob-a-thon 2026 Submission"
- Add topics: `ibm-watsonx`, `ai`, `meeting-intelligence`, `bob-a-thon`, `typescript`, `nodejs`

### 2. Add Repository Website

- In Settings, add website: Your deployed URL (if available)

### 3. Enable Issues (Optional)

- Settings → Features → ✅ Issues

### 4. Create README Badges (Optional)

Add to top of README.md:
```markdown
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![IBM watsonx.ai](https://img.shields.io/badge/IBM-watsonx.ai-blue)](https://www.ibm.com/watsonx)
```

---

## 🔄 Making Updates After Initial Push

```bash
# Make changes to files
# ...

# Check what changed
git status

# Add changed files
git add .

# Commit changes
git commit -m "Description of changes"

# Push to GitHub
git push
```

---

## 🚨 Troubleshooting

### Problem: "fatal: remote origin already exists"

```bash
# Remove existing remote
git remote remove origin

# Add new remote
git remote add origin https://github.com/YOUR_USERNAME/meeting-memory-intelligence.git
```

### Problem: "Permission denied (publickey)"

- You need to set up authentication (see above)
- Use Personal Access Token or SSH key

### Problem: "Large files detected"

```bash
# Check file sizes
find . -type f -size +50M

# If you have large files, add them to .gitignore
echo "path/to/large/file" >> .gitignore

# Remove from git cache
git rm --cached path/to/large/file

# Commit and push
git commit -m "Remove large files"
git push
```

### Problem: "Updates were rejected"

```bash
# Pull latest changes first
git pull origin main --rebase

# Then push
git push
```

---

## 📦 What Gets Committed

### ✅ Included in Repository:
- All source code (api/, web/)
- Documentation files (*.md)
- Configuration files (package.json, tsconfig.json, etc.)
- .env.example (template)
- Dockerfile
- LICENSE
- .gitignore

### ❌ Excluded from Repository (in .gitignore):
- node_modules/
- .env (contains secrets!)
- api/data/*.db (database files)
- logs/
- api/exports/
- .DS_Store
- Coverage reports

---

## 🎉 Success!

Once pushed, your repository URL will be:
```
https://github.com/YOUR_USERNAME/meeting-memory-intelligence
```

**This is the URL you'll submit for Bob-a-thon!**

---

## 📋 Post-Push Checklist

- [ ] Repository is accessible on GitHub
- [ ] README.md displays correctly
- [ ] All documentation is visible
- [ ] No sensitive data (API keys, .env) in repository
- [ ] Repository URL copied for submission
- [ ] (Optional) Repository description and topics added
- [ ] (Optional) Star your own repository 😊

---

## 🔗 Useful GitHub Commands

```bash
# View remote URL
git remote -v

# View commit history
git log --oneline

# View current branch
git branch

# Create new branch
git checkout -b feature-name

# Switch branches
git checkout main

# View changes
git diff

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1
```

---

## 📞 Need Help?

- **Git Documentation**: https://git-scm.com/doc
- **GitHub Docs**: https://docs.github.com
- **GitHub Support**: https://support.github.com

---

**Ready to push to GitHub? Follow the Quick Setup steps above!**