import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

console.log('🔒 Running Content Security Policy & Inline Style Validation...');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
let errors = [];

function addError(message) {
  errors.push(message);
  console.error(`❌ [CSP Violation] ${message}`);
}

// 1. Validate vercel.json
const vercelPath = path.join(projectRoot, 'vercel.json');
if (!fs.existsSync(vercelPath)) {
  addError('vercel.json file is missing.');
} else {
  try {
    const vercelConfig = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
    const headersConfig = vercelConfig.headers || [];
    const globalHeaderRule = headersConfig.find(h => h.source === '/(.*)' || h.source === '(.*)');
    if (!globalHeaderRule) {
      addError('vercel.json missing global headers rule for /(.*)');
    } else {
      const cspHeader = (globalHeaderRule.headers || []).find(
        h => h.key && h.key.toLowerCase() === 'content-security-policy'
      );
      if (!cspHeader) {
        addError('vercel.json missing Content-Security-Policy header in global headers.');
      } else {
        const val = cspHeader.value;
        if (val.includes("'unsafe-inline'")) {
          addError("vercel.json production CSP contains 'unsafe-inline' directive.");
        }
        if (val.includes("'unsafe-eval'")) {
          addError("vercel.json production CSP contains 'unsafe-eval' directive.");
        }
        if (!val.includes('fonts.googleapis.com')) {
          addError('vercel.json CSP missing fonts.googleapis.com authorization.');
        }
        if (!val.includes('fonts.gstatic.com')) {
          addError('vercel.json CSP missing fonts.gstatic.com authorization.');
        }
        if (!val.includes('blob:')) {
          addError('vercel.json CSP missing blob: image source authorization.');
        }
      }
    }
  } catch (err) {
    addError(`Failed to parse vercel.json: ${err.message}`);
  }
}

// 2. Validate vite.config.ts
const vitePath = path.join(projectRoot, 'vite.config.ts');
if (!fs.existsSync(vitePath)) {
  addError('vite.config.ts file is missing.');
} else {
  const viteContent = fs.readFileSync(vitePath, 'utf8');
  if (!viteContent.includes('Content-Security-Policy')) {
    addError('vite.config.ts does not configure Content-Security-Policy headers.');
  }
  if (!viteContent.includes('STRICT_CSP') && !viteContent.includes('preview')) {
    addError('vite.config.ts missing strict preview server CSP configuration.');
  }
}

// 3. Validate API Endpoints
const apiFiles = ['api/inpaint.ts', 'api/style-transfer.ts'];
for (const file of apiFiles) {
  const filePath = path.join(projectRoot, file);
  if (!fs.existsSync(filePath)) {
    addError(`API file ${file} is missing.`);
  } else {
    const content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes('Content-Security-Policy')) {
      addError(`${file} does not set Content-Security-Policy response header.`);
    }
  }
}

// 4. Validate index.html and dist/index.html
const indexHtmlFiles = ['index.html', 'dist/index.html'];
for (const file of indexHtmlFiles) {
  const filePath = path.join(projectRoot, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes('http-equiv="Content-Security-Policy"')) {
      addError(`${file} missing <meta http-equiv="Content-Security-Policy"> fallback tag.`);
    }
    // Check for inline style blocks in index.html
    const styleMatches = content.match(/<style[\s\S]*?>[\s\S]*?<\/style>/gi);
    if (styleMatches && styleMatches.length > 0) {
      addError(`${file} contains inline <style> tags which violate strict CSP.`);
    }
  }
}

// 5. Scan JSX/TSX component files for inline style="..." attributes
function scanDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDirectory(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.jsx'))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      // Matches style={{ ... }} in React components
      if (/style=\{\{/g.test(content)) {
        addError(`Component ${path.relative(projectRoot, fullPath)} contains inline style={{ ... }} attribute.`);
      }
    }
  }
}

scanDirectory(path.join(projectRoot, 'src'));

if (errors.length > 0) {
  console.error(`\n💥 CSP Validation Failed with ${errors.length} error(s).\n`);
  process.exit(1);
} else {
  console.log('✅ Content Security Policy and Class-Based Styling Validation Passed (100% compliant).\n');
}
