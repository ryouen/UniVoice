/**
 * デバッグヘルパー - 開発時のみ有効
 */

export function setupDebugHelpers() {
  if (process.env.NODE_ENV === 'development') {
    // グローバルに公開
    (window as any).__UNIVOICE_DEBUG__ = {
      checkRealtimeDisplay: () => {
        console.log('=== リアルタイム表示デバッグ ===');
        
        const original = document.getElementById('currentOriginal');
        const translation = document.getElementById('currentTranslation');
        
        console.log('原文要素:', original);
        console.log('翻訳要素:', translation);
        
        if (original) {
          console.log('原文内容:', original.textContent);
          console.log('原文の親要素:', original.parentElement);
          console.log('原文のスタイル:', window.getComputedStyle(original));
        }
        
        if (translation) {
          console.log('翻訳内容:', translation.textContent);
          console.log('翻訳の親要素:', translation.parentElement);
          console.log('翻訳のスタイル:', window.getComputedStyle(translation));
        }
        
        // Reactコンポーネントツリーの確認
        const root = document.getElementById('root');
        if (root) {
          console.log('Rootのクラス:', root.className);
          console.log('Root以下のDOM構造:');
          console.log(root.innerHTML.substring(0, 500) + '...');
        }
        
        // ThreeLineDisplayの確認
        const threeLineDisplays = document.querySelectorAll('[class*="three-line"]');
        console.log('ThreeLineDisplay要素数:', threeLineDisplays.length);
        threeLineDisplays.forEach((el, i) => {
          console.log(`ThreeLineDisplay[${i}]:`, el);
        });
      },
      
      findComponent: (id: string) => {
        const el = document.getElementById(id);
        if (el) {
          console.log(`要素 #${id} 発見:`, el);
          console.log('内容:', el.textContent);
          console.log('表示状態:', window.getComputedStyle(el).display);
          console.log('可視性:', window.getComputedStyle(el).visibility);
          console.log('opacity:', window.getComputedStyle(el).opacity);
          console.log('高さ:', window.getComputedStyle(el).height);
          console.log('幅:', window.getComputedStyle(el).width);
        } else {
          console.log(`要素 #${id} が見つかりません`);
        }
      }
    };
    
    console.log('%c🔧 UniVoice Debug Helpers Loaded', 'color: #667eea; font-weight: bold');
    console.log('使用可能なコマンド:');
    console.log('  __UNIVOICE_DEBUG__.checkRealtimeDisplay()');
    console.log('  __UNIVOICE_DEBUG__.findComponent(id)');
  }
}