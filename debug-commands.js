// UniVoice デバッグコマンド集
// F12でDevToolsを開き、Consoleタブでこれらのコマンドを実行

// 1. LocalStorageの内容を確認
console.log('=== LocalStorage Contents ===');
for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    console.log(`${key}:`, localStorage.getItem(key));
}

// 2. UniVoice関連のデータを確認
console.log('\n=== UniVoice Session Data ===');
console.log('univoice-active-session:', localStorage.getItem('univoice-active-session'));
console.log('sourceLanguage:', localStorage.getItem('sourceLanguage'));
console.log('targetLanguage:', localStorage.getItem('targetLanguage'));

// 3. LocalStorageをクリアする
function clearUniVoiceData() {
    console.log('\n=== Clearing UniVoice Data ===');
    const keys = ['univoice-active-session', 'sourceLanguage', 'targetLanguage'];
    keys.forEach(key => {
        if (localStorage.getItem(key)) {
            localStorage.removeItem(key);
            console.log(`Removed: ${key}`);
        }
    });
    console.log('UniVoice data cleared. Press Ctrl+R to reload.');
}

// 4. 全てのLocalStorageをクリア
function clearAllData() {
    console.log('\n=== Clearing All LocalStorage ===');
    const count = localStorage.length;
    localStorage.clear();
    console.log(`Cleared ${count} items. Press Ctrl+R to reload.`);
}

// 使用方法を表示
console.log('\n=== Available Commands ===');
console.log('clearUniVoiceData() - UniVoice関連のデータのみクリア');
console.log('clearAllData() - 全てのLocalStorageをクリア');
console.log('Ctrl+Shift+R - アプリをリセット（推奨）');