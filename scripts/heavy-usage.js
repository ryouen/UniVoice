const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync('analysis-dependency-graph.json', 'utf8'));
const edges = data.edges;
const threshold = 20;

const inverted = new Map();

for (const [file, deps] of Object.entries(edges)) {
  for (const dep of deps) {
    if (dep.startsWith('external:')) continue;
    if (!inverted.has(dep)) inverted.set(dep, new Set());
    inverted.get(dep).add(file);
  }
}

const heavy = [];
for (const [file, dependents] of inverted.entries()) {
  if (dependents.size >= threshold) {
    heavy.push({ file, dependents: Array.from(dependents), count: dependents.size });
  }
}

heavy.sort((a, b) => b.count - a.count);
fs.writeFileSync('analysis-heavily-used.json', JSON.stringify(heavy, null, 2));
console.log(`Heavy usage summary -> analysis-heavily-used.json (threshold=${threshold})`);
