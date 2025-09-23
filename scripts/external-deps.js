const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync('analysis-dependency-graph.json', 'utf8'));
const edges = data.edges;

function getExternalCount(map) {
  const counts = new Map();
  for (const deps of Object.values(map)) {
    for (const dep of deps) {
      if (dep.startsWith('external:')) {
        const name = dep.slice('external:'.length);
        counts.set(name, (counts.get(name) || 0) + 1);
      }
    }
  }
  return counts;
}

const extCounts = getExternalCount(edges);
const topExternal = Array.from(extCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
fs.writeFileSync('analysis-external-deps.json', JSON.stringify(topExternal, null, 2));
console.log('Top external deps -> analysis-external-deps.json');
