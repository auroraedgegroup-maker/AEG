# GitHub + ChatGPT

## GitHub repo target

- Owner: `chrisalvarezr-spec`
- Repository name: `aurora-edge-group`
- Suggested visibility: `private` until you are ready to share it
- GitHub sign-in email: `auroraedgegroup@gmail.com`

Important:
- GitHub repositories publish under the GitHub username or organization, not the sign-in email.
- In this project, `auroraedgegroup@gmail.com` is the brand/admin contact email. The repo owner is still `chrisalvarezr-spec` unless you create or switch to an organization.

## Install local tools

```bash
cd /Users/christopherrojas/Documents/New\ project/aurora-edge-group
bash scripts/install_tools.sh
source scripts/use_tools.sh
```

## Publish the repo

1. Authenticate GitHub CLI:

```bash
cd /Users/christopherrojas/Documents/New\ project/aurora-edge-group
source scripts/use_tools.sh
gh auth login --web --git-protocol https
```

2. Create the repository and push this project:

```bash
cd /Users/christopherrojas/Documents/New\ project/aurora-edge-group
bash scripts/publish_github_repo.sh
```

## Manual push fallback

```bash
cd /Users/christopherrojas/Documents/New\ project/aurora-edge-group
git remote add origin git@github.com:chrisalvarezr-spec/aurora-edge-group.git
git push -u origin main
```

If you prefer HTTPS:

```bash
cd /Users/christopherrojas/Documents/New\ project/aurora-edge-group
git remote add origin https://github.com/chrisalvarezr-spec/aurora-edge-group.git
git push -u origin main
```

## Connect the repo to ChatGPT

1. Open ChatGPT Settings.
2. Go to `Apps`.
3. Select `GitHub`.
4. Install and authorize the ChatGPT GitHub app.
5. Grant access to `chrisalvarezr-spec/aurora-edge-group`.
6. Wait about 5 minutes for the repository to appear in ChatGPT.

If the repo still does not appear, search for this in GitHub to trigger indexing:

```text
repo:chrisalvarezr-spec/aurora-edge-group import
```

## What ChatGPT can do after connection

- Read the repository code and docs
- Search the repo from prompts
- Cite files and snippets from the repo

ChatGPT's GitHub app does not push code changes back to GitHub. For write access and PR workflows, keep using Codex.
