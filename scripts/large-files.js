const fs = require('fs');
const path = require('path');
const projectRoot = process.cwd();
const targets = ['src', 'electron'];
const exts = new Set(['.ts', '.tsx']);
const ignore = [/node_modules/, /dist/, /backup\//, /archive\//, /dist-electron\//];
const files = [];

function shouldIgnore(p) {
  return ignore.some(re => re.test(p.replace(/\\/g, '/')));
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (shouldIgnore(full)) continue;
    if (entry.isDirectory()) {
      walk(full);
    } else if (exts.has(path.extname(entry.name))) {
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split(/\r?\n/).length;
      if (lines >= 400) {
        files.push({ file: path.relative(projectRoot, full).replace(/\\/g, '/'), lines });
      }
    }
  }
}

for (const target of targets) {
  const full = path.join(projectRoot, target);
  if (fs.existsSync(full)) walk(full);
}

files.sort((a, b) => b.lines - a.lines);
const payload = {
  generatedAt: new Date().toISOString(),
  threshold: 400,
  files,
};
fs.writeFileSync(path.join(projectRoot, 'analysis-large-files.json'), JSON.stringify(payload, null, 2));
console.log(`Large file summary -> analysis-large-files.json (${files.length} files >= 400 lines)`);
