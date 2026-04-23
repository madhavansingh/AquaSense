# Contributing to AquaSense

Thank you for your interest in contributing! This document outlines how to get involved.

## Code of Conduct

By participating, you agree to be respectful and constructive in all interactions.

## How to Contribute

### Reporting Bugs
- Use the **Bug Report** issue template
- Include steps to reproduce, expected vs actual behaviour, and your OS/Python/Node versions

### Suggesting Features
- Use the **Feature Request** issue template
- Describe the problem you're solving, not just the solution

### Submitting Code

1. **Fork** the repo and create a feature branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Follow commit conventions** (Conventional Commits):
   ```
   feat: add batch export to CSV
   fix: handle empty image uploads gracefully
   docs: update API reference for /predict
   refactor: simplify domain classifier logic
   ```

3. **Backend:** ensure code works with the existing FastAPI structure; add docstrings to new functions.

4. **Frontend:** follow the existing design-system CSS tokens; no new CSS frameworks.

5. **AI/Model:** if changing `predict.py` or `train_model.py`, document accuracy impact in the PR.

6. **Tests:** include a brief description of manual testing steps performed in your PR.

7. Open a **Pull Request** against `main` using the provided template.

## Development Setup

See the [Getting Started](README.md#getting-started) section in the README.

## Questions?

Open a GitHub Discussion or file an issue with the `question` label.
