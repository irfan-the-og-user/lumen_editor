import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.vercel', 'public']);

// Common uppercase words or acronyms in markdown that are not environment variables
const NON_ENV_WORDS = new Set([
  'HTML', 'CSS', 'URL', 'JSON', 'VRAM', 'RAM', 'GPU', 'DPI', 'CPU', 'AI', 'CTA',
  'SVG', 'IIT', 'PS', 'HTTP', 'HTTPS', 'VITE', 'NODE_ENV', 'A/B', 'HD', 'OK',
  'README', 'DESIGN', 'DEMO', 'MARKET', 'KNOWN', 'WIREFRAMES', 'API'
]);

function getMarkdownFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (IGNORED_DIRS.has(file)) continue;
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getMarkdownFiles(filePath));
    } else if (file.endsWith('.md')) {
      results.push(filePath);
    }
  }
  return results;
}

function loadPackageScripts() {
  const pkgPath = path.join(rootDir, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    console.error(`[ERROR] package.json not found at ${pkgPath}`);
    process.exit(1);
  }
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  return pkg.scripts || {};
}

function loadEnvExampleKeys() {
  const envPath = path.join(rootDir, '.env.example');
  if (!fs.existsSync(envPath)) {
    return { exists: false, keys: new Set() };
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split('\n');
  const keys = new Set();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Match KEY=value or # KEY=value or export KEY=value
    const match = trimmed.match(/^(?:#\s*|export\s+)?([A-Z0-9_]+)\s*=/);
    if (match) {
      keys.add(match[1]);
    }
  }

  return { exists: true, keys };
}

function validateDocs() {
  const errors = [];
  const packageScripts = loadPackageScripts();
  const envExample = loadEnvExampleKeys();

  if (!envExample.exists) {
    errors.push({
      file: '.env.example',
      line: 1,
      type: 'Missing Template',
      details: 'Canonical environment configuration template .env.example was not found.',
      action: 'Create .env.example with required environment variable definitions.'
    });
  }

  const markdownFiles = getMarkdownFiles(rootDir);

  for (const filePath of markdownFiles) {
    const relativePath = path.relative(rootDir, filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    let inCodeBlock = false;
    let codeBlockLang = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Code block toggles
      if (line.trim().startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeBlockLang = line.trim().slice(3).toLowerCase();
        } else {
          inCodeBlock = false;
          codeBlockLang = '';
        }
      }

      // 1. Check for npm run commands
      const npmRunRegex = /npm\s+run\s+([a-zA-Z0-9_:-]+)/g;
      let npmMatch;
      while ((npmMatch = npmRunRegex.exec(line)) !== null) {
        const scriptName = npmMatch[1];
        if (!packageScripts[scriptName]) {
          errors.push({
            file: relativePath,
            line: lineNum,
            type: 'Command Mismatch',
            details: `Script '${scriptName}' cited in command 'npm run ${scriptName}' does not exist in package.json scripts.`,
            action: `Add '${scriptName}' to package.json scripts or update '${relativePath}' to reference a valid script.`
          });
        }
      }

      // 2. Check for environment variable citations
      // Match export VAR=... or export VAR
      const exportRegex = /export\s+([A-Z0-9_]+)(?:=|\s|$)/g;
      let exportMatch;
      while ((exportMatch = exportRegex.exec(line)) !== null) {
        const varName = exportMatch[1];
        if (!NON_ENV_WORDS.has(varName) && envExample.exists && !envExample.keys.has(varName)) {
          errors.push({
            file: relativePath,
            line: lineNum,
            type: 'Environment Variable Mismatch',
            details: `Environment variable '${varName}' is cited in setup documentation but not defined in .env.example.`,
            action: `Add '${varName}' to .env.example or update documentation in '${relativePath}'.`
          });
        }
      }

      // Match process.env.VAR or import.meta.env.VAR
      const processEnvRegex = /(?:process\.env|import\.meta\.env)\.([A-Z0-9_]+)/g;
      let procMatch;
      while ((procMatch = processEnvRegex.exec(line)) !== null) {
        const varName = procMatch[1];
        if (!NON_ENV_WORDS.has(varName) && envExample.exists && !envExample.keys.has(varName)) {
          errors.push({
            file: relativePath,
            line: lineNum,
            type: 'Environment Variable Mismatch',
            details: `Environment variable '${varName}' is cited in documentation but not defined in .env.example.`,
            action: `Add '${varName}' to .env.example or update documentation in '${relativePath}'.`
          });
        }
      }

      // Match $VAR or ${VAR} in shell/bash blocks or lines
      const dollarEnvRegex = /\$\{?([A-Z][A-Z0-9_]{2,})\}?/g;
      let dollarMatch;
      if (inCodeBlock && (codeBlockLang === 'bash' || codeBlockLang === 'sh' || codeBlockLang === 'shell' || codeBlockLang === '')) {
        while ((dollarMatch = dollarEnvRegex.exec(line)) !== null) {
          // Only if preceded by $
          const matchIdx = dollarMatch.index;
          if (matchIdx > 0 && line[matchIdx - 1] === '$') {
            const varName = dollarMatch[1];
            if (!NON_ENV_WORDS.has(varName) && envExample.exists && !envExample.keys.has(varName)) {
              errors.push({
                file: relativePath,
                line: lineNum,
                type: 'Environment Variable Mismatch',
                details: `Environment variable '$${varName}' is cited in setup documentation but not defined in .env.example.`,
                action: `Add '${varName}' to .env.example or update documentation in '${relativePath}'.`
              });
            }
          }
        }
      }

      // Match VAR=value lines in bash/sh code blocks or env sections
      if (inCodeBlock && (codeBlockLang === 'bash' || codeBlockLang === 'sh' || codeBlockLang === 'env' || codeBlockLang === '')) {
        const envAssignMatch = line.trim().match(/^([A-Z][A-Z0-9_]{2,})\s*=/);
        if (envAssignMatch) {
          const varName = envAssignMatch[1];
          if (!NON_ENV_WORDS.has(varName) && !line.trim().startsWith('export') && envExample.exists && !envExample.keys.has(varName)) {
            errors.push({
              file: relativePath,
              line: lineNum,
              type: 'Environment Variable Mismatch',
              details: `Environment variable '${varName}' is assigned in documentation but not defined in .env.example.`,
              action: `Add '${varName}' to .env.example or update documentation in '${relativePath}'.`
            });
          }
        }
      }
    }
  }

  if (errors.length > 0) {
    console.error('\n========================================================================');
    console.error(`[DOCUMENTATION VALIDATION FAILED] Found ${errors.length} mismatch error(s):\n`);
    errors.forEach((err, idx) => {
      console.error(`${idx + 1}) File: ${err.file}:${err.line}`);
      console.error(`   Type: ${err.type}`);
      console.error(`   Details: ${err.details}`);
      console.error(`   Action: ${err.action}\n`);
    });
    console.error('========================================================================\n');
    process.exit(1);
  } else {
    console.log('✔ Documentation verification passed: All setup commands and environment variables match codebase configuration.');
    process.exit(0);
  }
}

validateDocs();
