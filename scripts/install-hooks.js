import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const gitHooksDir = path.join(rootDir, '.git', 'hooks');
const preCommitHookPath = path.join(gitHooksDir, 'pre-commit');

const hookContent = `#!/usr/bin/env sh
# Automated setup reconciliation pre-commit hook
# Validates documentation commands and environment variables before committing.

echo "🔍 Running pre-commit documentation verification..."
npm run validate-docs
if [ $? -ne 0 ]; then
  echo "\n❌ Pre-commit check failed: Documentation mismatch detected."
  echo "   Please fix the errors above or update .env.example / package.json before committing."
  echo "   (Emergency bypass: git commit --no-verify)\n"
  exit 1
fi
`;

function installHooks() {
  if (!fs.existsSync(gitHooksDir)) {
    console.log(`ℹ .git/hooks directory not found at ${gitHooksDir}. Skipping hook installation.`);
    return;
  }

  fs.writeFileSync(preCommitHookPath, hookContent, { encoding: 'utf8', mode: 0o755 });
  // Ensure executable permissions
  try {
    fs.chmodSync(preCommitHookPath, 0o755);
  } catch (err) {
    // Ignore permissions error on Windows if any
  }

  try {
    execSync('git config core.hooksPath .git/hooks', { cwd: rootDir, stdio: 'ignore' });
  } catch (err) {
    // Ignore error if git command fails
  }

  console.log('✔ Pre-commit hook installed successfully at .git/hooks/pre-commit');
}

installHooks();
