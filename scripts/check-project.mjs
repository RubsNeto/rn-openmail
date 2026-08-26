#!/usr/bin/env node
// SPDX-License-Identifier: GPL-3.0-only
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import vm from 'node:vm';

const root = resolve(import.meta.dirname, '..');
const failures = [];
const required = [
  '.github/workflows/ci.yml',
  '.github/workflows/codeql.yml',
  'CHANGELOG.md',
  'CODE_OF_CONDUCT.md',
  'CONTRIBUTING.md',
  'LICENSE',
  'NOTICE.md',
  'README.md',
  'README.pt-BR.md',
  'SECURITY.md',
  'SUPPORT.md',
  'TRADEMARKS.md',
  'VERSION',
  'config/rn-config.example.js',
  'docs/CONFIGURATION.md',
  'docs/INSTALLATION.md',
  'docs/UPGRADING.md',
  'scripts/install.sh',
  'scripts/rollback.sh',
  'scripts/validate.sh',
  'src/mailcow/rn-profile-photo.php',
  'src/mailcow/rn-suite.css',
  'src/mailcow/rn-suite.js',
  'src/sogo/custom-sogo.js',
  'src/sogo/custom-theme.css',
  'src/sogo/custom-theme.js'
];

function fail(message) {
  failures.push(message);
}

for (const path of required) {
  try {
    if (!statSync(join(root, path)).isFile()) fail(`required path is not a file: ${path}`);
  } catch {
    fail(`required file is missing: ${path}`);
  }
}

const ignoredDirectories = new Set(['.git', 'node_modules']);
const textExtensions = new Set(['.css', '.html', '.js', '.json', '.md', '.mjs', '.php', '.sh', '.svg', '.txt', '.yaml', '.yml']);
const textFiles = [];

function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else if (entry.isFile() && textExtensions.has(extname(entry.name).toLowerCase())) textFiles.push(absolute);
  }
}
walk(root);

const forbiddenLiterals = [
  ['mail.rndesign.dev', 'production hostname'],
  ['rndesign.dev', 'private domain'],
  ['rnservicos.com.br', 'private domain'],
  ['rnetecnologia.com.br', 'private domain'],
  ['rubsneto/email', 'private repository'],
  ['mailcow-rn-theme-stage', 'private staging path']
];
const forbiddenPatterns = [
  [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g, 'private key'],
  [/\bgh[pousr]_[A-Za-z0-9_]{30,}\b/g, 'GitHub token'],
  [/\bAKIA[0-9A-Z]{16}\b/g, 'AWS access key']
];

for (const absolute of textFiles) {
  const path = relative(root, absolute).replaceAll('\\', '/');
  const contents = readFileSync(absolute, 'utf8');
  if (contents.includes('\r\n')) fail(`${path}: CRLF line endings found`);
  if (path !== 'scripts/check-project.mjs') {
    const lowerContents = contents.toLowerCase();
    for (const [value, label] of forbiddenLiterals) {
      if (lowerContents.includes(value)) fail(`${path}: ${label} found`);
    }
    for (const [pattern, label] of forbiddenPatterns) {
      pattern.lastIndex = 0;
      if (pattern.test(contents)) fail(`${path}: ${label} found`);
    }
  }
}

for (const path of [
  'config/rn-config.example.js',
  'src/mailcow/rn-suite.js',
  'src/sogo/custom-sogo.js',
  'src/sogo/custom-theme.js'
]) {
  const contents = readFileSync(join(root, path), 'utf8');
  try {
    new vm.Script(contents, { filename: path });
  } catch (error) {
    fail(`${path}: JavaScript parse error: ${error.message}`);
  }
}

for (const path of ['src/mailcow/rn-suite.css', 'src/sogo/custom-theme.css']) {
  const contents = readFileSync(join(root, path), 'utf8');
  const opens = (contents.match(/{/g) || []).length;
  const closes = (contents.match(/}/g) || []).length;
  if (opens !== closes) fail(`${path}: unbalanced braces (${opens} opening, ${closes} closing)`);
}

const configExample = readFileSync(join(root, 'config/rn-config.example.js'), 'utf8');
if (!configExample.includes("defaultDomain: 'example.com'")) fail('configuration example must use example.com');
if (!configExample.includes("directoryLabel: 'Internal directory'")) fail('configuration example must include a generic directory label');
if (!readFileSync(join(root, '.gitignore'), 'utf8').includes('config/rn-config.js')) {
  fail('.gitignore must exclude config/rn-config.js');
}

const licenseChecks = [
  ['LICENSES/GPL-3.0-only.txt', 'GNU GENERAL PUBLIC LICENSE'],
  ['LICENSES/GPL-2.0-only.txt', 'GNU GENERAL PUBLIC LICENSE'],
  ['LICENSES/OFL-1.1.txt', 'SIL OPEN FONT LICENSE'],
  ['LICENSES/Apache-2.0.txt', 'Apache License']
];
for (const [path, marker] of licenseChecks) {
  try {
    if (!readFileSync(join(root, path), 'utf8').includes(marker)) fail(`${path}: expected license marker not found`);
  } catch {
    fail(`${path}: license text is missing`);
  }
}

const spdxChecks = [
  ['src/mailcow/rn-profile-photo.php', 'GPL-3.0-only'],
  ['src/mailcow/rn-suite.css', 'GPL-3.0-only'],
  ['src/mailcow/rn-suite.js', 'GPL-3.0-only'],
  ['src/sogo/custom-theme.css', 'GPL-2.0-only'],
  ['src/sogo/custom-theme.js', 'GPL-2.0-only'],
  ['src/sogo/custom-sogo.js', 'GPL-2.0-only']
];
for (const [path, identifier] of spdxChecks) {
  const contents = readFileSync(join(root, path), 'utf8');
  if (!contents.slice(0, 500).includes(`SPDX-License-Identifier: ${identifier}`)) {
    fail(`${path}: SPDX identifier ${identifier} is missing near the top`);
  }
}

const installer = readFileSync(join(root, 'scripts/install.sh'), 'utf8');
for (const marker of ['rn-profile-photo.php', 'rn-profile-photos', '--force-recreate', 'sogo_script_tmp']) {
  if (!installer.includes(marker)) fail(`installer integration marker is missing: ${marker}`);
}

const sogoScript = readFileSync(join(root, 'src/sogo/custom-sogo.js'), 'utf8');
for (const marker of ['function syncMessageRouteState', 'rn-message-loading', 'openProfileCropper', 'MAIL_CONFIG.defaultDomain']) {
  if (!sogoScript.includes(marker)) fail(`SOGo integration marker is missing: ${marker}`);
}
try {
  new vm.Script(`${configExample}\n${sogoScript}`, { filename: 'installed-custom-sogo.js' });
} catch (error) {
  fail(`combined SOGo configuration/script parse error: ${error.message}`);
}

if (failures.length) {
  console.error(`Project checks failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Project checks passed across ${textFiles.length} text files.`);
