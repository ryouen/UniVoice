// 最も簡単なフィルタ - コンソールに貼り付けるだけ
// className関連のログのみを強調表示

(function() {
    const _log = console.log;
    console.log = function(...args) {
        const text = args.join(' ');
        if (text.match(/className|COMPANY|session_|startFromMicrophone|activeSession/i)) {
            _log('%c[FILTERED]', 'background: yellow; color: black; font-weight: bold', ...args);
        } else {
            _log(...args);
        }
    };
    console.log('✅ Filter activated - className related logs will be highlighted');
})();