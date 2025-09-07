const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('Starting UniVoice clean restart monitor...');

// Get today's log file
const today = new Date().toISOString().split('T')[0];
const logFile = path.join(__dirname, 'logs', `univoice-${today}.jsonl`);

console.log(`Monitoring log file: ${logFile}`);

// Track last position
let lastPosition = 0;
try {
  const stats = fs.statSync(logFile);
  lastPosition = stats.size;
} catch (e) {
  console.log('Log file does not exist yet');
}

// Monitor function
function monitorLogs() {
  try {
    const stats = fs.statSync(logFile);
    if (stats.size > lastPosition) {
      const buffer = Buffer.alloc(stats.size - lastPosition);
      const fd = fs.openSync(logFile, 'r');
      fs.readSync(fd, buffer, 0, buffer.length, lastPosition);
      fs.closeSync(fd);
      
      const newContent = buffer.toString();
      const lines = newContent.split('\n').filter(l => l.trim());
      
      lines.forEach(line => {
        try {
          const log = JSON.parse(line);
          
          // Highlight important events
          if (log.message.includes('App ready') || 
              log.message.includes('Starting') ||
              log.message.includes('startup-check') ||
              log.message.includes('ThreeLineDisplay') ||
              log.message.includes('ASR') ||
              log.message.includes('asr') ||
              log.message.includes('currentOriginalUpdate') ||
              log.message.includes('display') ||
              log.message.includes('sentence')) {
            console.log(`[${new Date(log.timestamp).toLocaleTimeString()}] ${log.level.toUpperCase()} - ${log.component}: ${log.message}`, log.data || '');
          }
        } catch (e) {
          // Ignore parse errors
        }
      });
      
      lastPosition = stats.size;
    }
  } catch (e) {
    // File might not exist yet
  }
}

// Run the startup script
console.log('Executing start-univoice.bat...');
const startProcess = spawn('cmd', ['/c', 'start-univoice.bat'], {
  cwd: __dirname,
  shell: true
});

startProcess.stdout.on('data', (data) => {
  console.log(`[STARTUP]: ${data.toString().trim()}`);
});

startProcess.stderr.on('data', (data) => {
  console.error(`[ERROR]: ${data.toString().trim()}`);
});

// Start monitoring
setInterval(monitorLogs, 500);

console.log('Monitoring started. Press Ctrl+C to stop.');