const http = require('http');

console.log('🔍 UniVoice App Verification Script');
console.log('==================================\n');

// Check if dev server is running
function checkDevServer() {
  return new Promise((resolve) => {
    http.get('http://localhost:5173', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Dev server is running on port 5173');
          console.log('   Response includes:', data.includes('UniVoice') ? 'UniVoice title' : 'Unknown content');
          resolve(true);
        } else {
          console.log('❌ Dev server returned status:', res.statusCode);
          resolve(false);
        }
      });
    }).on('error', (err) => {
      console.log('❌ Dev server is not running:', err.message);
      resolve(false);
    });
  });
}

// Check production build
function checkProductionBuild() {
  const fs = require('fs');
  const path = require('path');
  
  console.log('\n📦 Checking production build...');
  
  const distPath = path.join(__dirname, 'dist');
  const indexPath = path.join(distPath, 'index.html');
  const electronPath = path.join(__dirname, 'dist-electron', 'main.js');
  
  if (fs.existsSync(indexPath)) {
    console.log('✅ Production HTML found');
    const html = fs.readFileSync(indexPath, 'utf8');
    console.log('   Title:', html.match(/<title>(.*?)<\/title>/)?.[1] || 'No title');
  } else {
    console.log('❌ Production HTML not found');
  }
  
  if (fs.existsSync(electronPath)) {
    console.log('✅ Electron main process built');
  } else {
    console.log('❌ Electron main process not built');
  }
}

// Check dependencies
function checkDependencies() {
  console.log('\n📚 Checking dependencies...');
  
  try {
    require('react');
    console.log('✅ React is installed');
  } catch {
    console.log('❌ React is not installed');
  }
  
  try {
    require('electron');
    console.log('✅ Electron is installed');
  } catch {
    console.log('❌ Electron is not installed');
  }
}

// Run all checks
async function runVerification() {
  checkDependencies();
  await checkDevServer();
  checkProductionBuild();
  
  console.log('\n🎯 Summary:');
  console.log('- To view in browser: http://localhost:5173');
  console.log('- To run Electron: npm run electron');
  console.log('- To build for production: npm run build');
}

runVerification();