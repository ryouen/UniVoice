/**
 * リアルタイム表示機能の動作確認スクリプト
 * 
 * 実行方法:
 * 1. アプリケーションが起動している状態で
 * 2. ブラウザの開発者ツールのコンソールで実行
 */

// リアルタイム表示要素の確認
function checkRealtimeDisplay() {
    console.log('=== UniVoice リアルタイム表示チェック ===');
    
    // 1. 要素の存在確認
    const originalElement = document.getElementById('currentOriginal');
    const translationElement = document.getElementById('currentTranslation');
    
    if (!originalElement) {
        console.error('❌ currentOriginal要素が見つかりません');
    } else {
        console.log('✅ currentOriginal要素: 存在', originalElement);
        console.log('   内容:', originalElement.textContent || '(空)');
        console.log('   スタイル:', window.getComputedStyle(originalElement).cssText.slice(0, 200) + '...');
    }
    
    if (!translationElement) {
        console.error('❌ currentTranslation要素が見つかりません');
    } else {
        console.log('✅ currentTranslation要素: 存在', translationElement);
        console.log('   内容:', translationElement.textContent || '(空)');
        console.log('   スタイル:', window.getComputedStyle(translationElement).cssText.slice(0, 200) + '...');
    }
    
    // 2. React コンポーネントの確認
    if (window.React && window.React.version) {
        console.log('✅ React バージョン:', window.React.version);
    }
    
    // 3. 履歴表示の確認
    const historyBlocks = document.querySelectorAll('.history-block');
    console.log('📚 履歴ブロック数:', historyBlocks.length);
    
    if (historyBlocks.length > 0) {
        const firstBlock = historyBlocks[0];
        const computedStyle = window.getComputedStyle(firstBlock);
        console.log('   最初のブロックの背景色:', computedStyle.backgroundColor);
        console.log('   期待値: rgb(250, 250, 250) または #fafafa');
    }
    
    // 4. グリッドレイアウトの確認
    const sentencePairs = document.querySelectorAll('.sentence-pair');
    if (sentencePairs.length > 0) {
        const firstPair = sentencePairs[0];
        const computedStyle = window.getComputedStyle(firstPair);
        console.log('📐 文ペアのグリッド設定:', computedStyle.gridTemplateColumns);
        console.log('   期待値: 1fr 1fr または類似の値');
    }
    
    // 5. パイプライン状態の確認（グローバル変数がある場合）
    if (window.__UNIVOICE_DEBUG__) {
        console.log('🔧 デバッグ情報:', window.__UNIVOICE_DEBUG__);
    }
    
    console.log('=== チェック完了 ===');
}

// 定期的な更新確認（5秒間）
function monitorRealtimeUpdates() {
    console.log('📡 リアルタイム更新の監視開始（5秒間）...');
    
    let previousOriginal = '';
    let previousTranslation = '';
    let updateCount = 0;
    
    const interval = setInterval(() => {
        const originalElement = document.getElementById('currentOriginal');
        const translationElement = document.getElementById('currentTranslation');
        
        if (originalElement && translationElement) {
            const currentOriginal = originalElement.textContent || '';
            const currentTranslation = translationElement.textContent || '';
            
            if (currentOriginal !== previousOriginal) {
                updateCount++;
                console.log(`🔄 [${new Date().toLocaleTimeString()}] 原文更新:`, currentOriginal);
                previousOriginal = currentOriginal;
            }
            
            if (currentTranslation !== previousTranslation) {
                updateCount++;
                console.log(`🔄 [${new Date().toLocaleTimeString()}] 翻訳更新:`, currentTranslation);
                previousTranslation = currentTranslation;
            }
        }
    }, 100);
    
    setTimeout(() => {
        clearInterval(interval);
        console.log(`📡 監視終了。更新回数: ${updateCount}`);
        if (updateCount === 0) {
            console.warn('⚠️ 5秒間更新がありませんでした。パイプラインが動作していない可能性があります。');
        }
    }, 5000);
}

// エクスポート（ブラウザコンソール用）
if (typeof module === 'undefined') {
    window.checkRealtimeDisplay = checkRealtimeDisplay;
    window.monitorRealtimeUpdates = monitorRealtimeUpdates;
    
    console.log('🚀 リアルタイム表示チェックツール読み込み完了');
    console.log('実行方法:');
    console.log('  checkRealtimeDisplay() - 現在の状態をチェック');
    console.log('  monitorRealtimeUpdates() - 5秒間更新を監視');
}

// Node.js環境でも使えるようにエクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { checkRealtimeDisplay, monitorRealtimeUpdates };
}