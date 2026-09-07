# Contributing Guidelines

Thank you for your interest in contributing to **Lumen AI**! We welcome contributions from developers, researchers, and open-source enthusiasts.

To maintain repository quality, stability, and security, please follow these guidelines when submitting contributions.

---

## 1. Security First Policy

- **Do NOT submit public issues or PRs for security vulnerabilities.**
- For all security vulnerability reports, refer to [`SECURITY.md`](./SECURITY.md) and report via private channels (`security@lumen-editor.org`).
- Ensure no sensitive credentials, API keys, or private tokens are committed to the repository.

---

## 2. Local Development Workflow

### Prerequisites
- **Node.js**: `>= 18.0`
- **npm**: `>= 9.0`

### Setup Steps
1. **Fork and clone** the repository:
   ```bash
   git clone https://github.com/irfan-the-og-user/lumen_editor.git
   cd lumen_editor
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Start local development server**:
   ```bash
   npm run dev
   ```
4. **Run code quality & security checks**:
   ```bash
   npm run lint   # Oxlint static analysis
   npm run build  # TypeScript & Vite production build
   npm audit      # Dependency vulnerability audit
   ```

---

## 3. Submitting Issues & Pull Requests

### Opening Issues
- Use the standardized issue templates when creating new reports:
  - **Bug Report Template**: For reporting non-security software bugs.
  - **Feature Request Template**: For proposing enhancements or new functionality.
- Ensure all relevant details (OS, browser, node version, reproduction steps) are included.

### Creating Pull Requests
1. Create a feature branch off `main` (`git checkout -b feature/my-feature`).
2. Make concise, focused commits with clear messages.
3. Verify that `npm run lint`, `npm run build`, and `npm audit` pass cleanly without errors.
4. Fill out the **Pull Request Template** completely, including the security checklist and verification steps.
5. All incoming PRs are automatically scanned by GitHub Actions security workflows prior to merge.

---

## 4. Code Governance & Standards

- Follow TypeScript strict typing and React best practices.
- Adhere to the design specifications in [`DESIGN.md`](./DESIGN.md).
- Keep external dependency additions to a minimum to maintain lightweight bundle limits (< 77 KB gzipped).
- Automated dependency updates opened by Dependabot require manual review and approval by Code Owners prior to merging.
