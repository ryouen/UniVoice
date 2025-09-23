const fs = require('fs');
const path = require('path');

const roots = ['src', 'electron'];
const projectRoot = process.cwd();
const exts = new Set(['.ts', '.tsx']);
const ignorePatterns = [/node_modules/, /dist/, /backup\//, /archive\//, /docs\//, /dist-electron\//];

const files = [];

function shouldIgnore(p) {
  return ignorePatterns.some((re) => re.test(p.replace(/\\/g, '/')));
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (shouldIgnore(full)) continue;
    if (entry.isDirectory()) walk(full);
    else {
      const ext = path.extname(entry.name);
      if (exts.has(ext)) files.push(full);
    }
  }
}

roots.forEach((dir) => {
  const full = path.join(projectRoot, dir);
  if (fs.existsSync(full)) walk(full);
});

const adjacency = new Map();

function normalizeFile(p) {
  return path.relative(projectRoot, p).replace(/\\/g, '/');
}

function resolveImport(fromFile, spec) {
  if (!spec) return null;
  if (spec.startsWith('@/')) {
    const target = path.join(projectRoot, 'src', spec.slice(2));
    return stripExt(target);
  }
  if (spec.startsWith('./') || spec.startsWith('../')) {
    const base = path.dirname(fromFile);
    const resolved = path.resolve(base, spec);
    return stripExt(resolved);
  }
  // treat as external
  return `external:${spec}`;
}

function stripExt(p) {
  const candidates = [p, `${p}.ts`, `${p}.tsx`, `${p}.d.ts`, `${p}/index.ts`, `${p}/index.tsx`];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return normalizeFile(candidate);
    }
  }
  return normalizeFile(p);
}

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const current = normalizeFile(file);
  const imports = [];
  const importRegex = /import\s+(?:[^'";]+from\s+)?['"]([^'";]+)['"];?/g;
  const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
  let match;
  while ((match = importRegex.exec(content))) imports.push(match[1]);
  while ((match = requireRegex.exec(content))) imports.push(match[1]);
  const resolved = new Set();
  for (const spec of imports) {
    const target = resolveImport(path.join(projectRoot, current), spec);
    if (target) resolved.add(target);
  }
  adjacency.set(current, Array.from(resolved));
}

const summary = {
  generatedAt: new Date().toISOString(),
  fileCount: files.length,
  edges: Object.fromEntries(adjacency),
};

fs.writeFileSync(path.join(projectRoot, 'analysis-dependency-graph.json'), JSON.stringify(summary, null, 2));
console.log(`Analyzed ${files.length} files. Output -> analysis-dependency-graph.json`);
