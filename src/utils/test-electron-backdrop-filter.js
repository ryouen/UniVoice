/**
 * Electron透過ウィンドウでのbackdrop-filter動作確認
 */

(function testElectronBackdropFilter() {
  console.group('🔍 Electron Backdrop-Filter テスト');
  
  // 1. 環境情報
  console.group('💻 環境情報');
  if (window.process && window.process.versions) {
    console.log('Electron:', window.process.versions.electron);
    console.log('Chrome:', window.process.versions.chrome);
    console.log('Node:', window.process.versions.node);
    console.log('Platform:', window.process.platform);
  }
  console.groupEnd();
  
  // 2. 現在のbackdrop-filter設定
  console.group('🎨 現在のBackdrop-Filter設定');
  const glassmorphismElements = document.querySelectorAll('[class*="glassmorphism"]');
  glassmorphismElements.forEach((el, i) => {
    const style = getComputedStyle(el);
    console.log(`要素${i+1}:`, {
      backdropFilter: style.backdropFilter,
      webkitBackdropFilter: style.webkitBackdropFilter,
      background: style.backgroundColor,
      opacity: style.opacity
    });
  });
  console.groupEnd();
  
  // 3. テスト要素を作成
  console.group('🧪 テスト要素での検証');
  
  // 既存のテスト要素を削除
  const existing = document.getElementById('backdrop-test');
  if (existing) existing.remove();
  
  // テスト要素を作成
  const testDiv = document.createElement('div');
  testDiv.id = 'backdrop-test';
  testDiv.innerHTML = `
    <div style="
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 400px;
      padding: 40px;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 20px;
      box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
      z-index: 99999;
    ">
      <h2 style="color: #333; margin: 0 0 20px 0;">Backdrop-Filter テスト</h2>
      <p style="color: #666; margin: 0 0 10px 0;">
        このボックスの背後がぼかされていますか？
      </p>
      <ul style="color: #666; margin: 0; padding-left: 20px;">
        <li>背後のアプリ（Word/PDF等）がぼやけて見える → ✅ 成功</li>
        <li>背後がクリアに見える → ❌ backdrop-filterが効いていない</li>
      </ul>
      <button onclick="this.parentElement.parentElement.remove()" style="
        margin-top: 20px;
        padding: 8px 16px;
        background: #667eea;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
      ">閉じる</button>
    </div>
  `;
  document.body.appendChild(testDiv);
  
  console.log('✅ テスト要素を表示しました');
  console.groupEnd();
  
  // 4. Electronの制限事項
  console.group('⚠️ 既知の制限事項');
  console.warn('Electronでbackdrop-filterが効かない場合の原因：');
  console.log('1. Windows: 一部のバージョンでは制限あり');
  console.log('2. GPU設定: ハードウェアアクセラレーションが必要');
  console.log('3. transparent: true 設定が必須');
  console.log('4. backgroundColor は完全透明である必要');
  console.groupEnd();
  
  // 5. 代替案
  console.group('💡 代替案');
  console.log('もしbackdrop-filterが効かない場合：');
  console.log('1. 半透明の背景色で代用');
  console.log('2. Windows 10の「アクリル効果」APIを使用（Windows限定）');
  console.log('3. macOSの vibrancy 効果を使用（macOS限定）');
  console.groupEnd();
  
  console.groupEnd();
})();