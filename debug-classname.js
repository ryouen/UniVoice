// className問題デバッグ用コンソールフィルタ
// F12開発者ツールのコンソールに貼り付けて実行

console.log('%c=== className Debug Filter Started ===', 'background: #222; color: #bada55; font-size: 16px; padding: 5px');

// オリジナルのconsole.logを保存
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

// フィルタリングされたログを格納
window.classNameLogs = [];

// className関連のキーワード
const keywords = [
  'className',
  'COMPANY',
  'session_',
  'Starting session',
  'Starting pipeline',
  'session-metadata-update',
  'courseName',
  'UniVoice.*session',
  'useUnifiedPipeline.*className',
  'activeSession',
  'startFromMicrophone'
];

// フィルタ関数
const shouldLog = (args) => {
  const text = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ');
  
  return keywords.some(keyword => {
    const regex = new RegExp(keyword, 'i');
    return regex.test(text);
  });
};

// console.logをオーバーライド
console.log = function(...args) {
  originalLog.apply(console, args);
  
  if (shouldLog(args)) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = {
      time: timestamp,
      type: 'log',
      message: args
    };
    window.classNameLogs.push(logEntry);
    
    // 強調表示
    originalLog.apply(console, [
      `%c[FILTERED ${timestamp}]`,
      'background: #333; color: #ff0; padding: 2px 5px; border-radius: 3px',
      ...args
    ]);
  }
};

// console.errorをオーバーライド
console.error = function(...args) {
  originalError.apply(console, args);
  
  if (shouldLog(args)) {
    const timestamp = new Date().toLocaleTimeString();
    window.classNameLogs.push({
      time: timestamp,
      type: 'error',
      message: args
    });
  }
};

// console.warnをオーバーライド
console.warn = function(...args) {
  originalWarn.apply(console, args);
  
  if (shouldLog(args)) {
    const timestamp = new Date().toLocaleTimeString();
    window.classNameLogs.push({
      time: timestamp,
      type: 'warn',
      message: args
    });
  }
};

// ヘルパー関数
window.showClassNameLogs = () => {
  console.log('%c=== Filtered className Logs ===', 'background: #000; color: #0f0; font-size: 14px; padding: 5px');
  window.classNameLogs.forEach((log, index) => {
    const style = log.type === 'error' ? 'color: #f00' : log.type === 'warn' ? 'color: #fa0' : 'color: #0af';
    console.log(`%c[${index}] ${log.time} [${log.type.toUpperCase()}]`, style, ...log.message);
  });
  console.log(`Total filtered logs: ${window.classNameLogs.length}`);
};

window.clearClassNameLogs = () => {
  window.classNameLogs = [];
  console.log('%cClassName logs cleared', 'color: #0f0');
};

window.exportClassNameLogs = () => {
  const logs = window.classNameLogs.map(log => ({
    ...log,
    message: log.message.map(m => typeof m === 'object' ? JSON.stringify(m, null, 2) : String(m)).join(' ')
  }));
  
  const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `className-debug-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
  console.log('%cLogs exported', 'color: #0f0');
};

// 使い方を表示
console.log(`%c使い方:
- showClassNameLogs(): フィルタされたログを表示
- clearClassNameLogs(): ログをクリア
- exportClassNameLogs(): ログをJSONファイルとして保存
- window.classNameLogs: 生のログデータにアクセス`,
'background: #333; color: #fff; padding: 10px; border-radius: 5px');

// 自動的に重要なイベントを監視
const checkInterval = setInterval(() => {
  const hasImportantLog = window.classNameLogs.some(log => 
    log.message.some(m => 
      String(m).includes('session_2025') || 
      String(m).includes('className: undefined') ||
      String(m).includes('empty className')
    )
  );
  
  if (hasImportantLog) {
    console.log('%c⚠️ 重要: デフォルトフォルダまたはundefined classNameが検出されました！', 
      'background: #f00; color: #fff; font-size: 16px; padding: 10px');
    clearInterval(checkInterval);
  }
}, 1000);

// 5分後に自動監視を停止
setTimeout(() => clearInterval(checkInterval), 5 * 60 * 1000);