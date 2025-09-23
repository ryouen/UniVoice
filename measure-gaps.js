// 間隔測定スクリプト
// ボタン間の正確な間隔を測定

function measureGaps() {
    console.log('=== Gap Measurement Tool ===');
    
    // 録音インジケータと最初のボタン間
    const recordingIndicator = document.querySelector('.recordingIndicator, [class*="recordingIndicator"]');
    const buttons = Array.from(document.querySelectorAll('button'));
    
    if (recordingIndicator) {
        const recRect = recordingIndicator.getBoundingClientRect();
        console.log('\n📍 Recording Indicator:');
        console.log(`  Position: left=${Math.round(recRect.left)}, width=${Math.round(recRect.width)}`);
        console.log(`  Right edge: ${Math.round(recRect.right)}`);
        
        // 録音インジケータの右側にある最初のボタンを探す
        const nextButton = buttons.find(btn => {
            const btnRect = btn.getBoundingClientRect();
            return btnRect.left > recRect.right && btnRect.top === recRect.top;
        });
        
        if (nextButton) {
            const btnRect = nextButton.getBoundingClientRect();
            const gap = Math.round(btnRect.left - recRect.right);
            console.log(`  Gap to first button: ${gap}px ${gap === 10 ? '✅' : '❌ Should be 10px'}`);
        }
    }
    
    // 設定バーのボタン群を測定
    console.log('\n📍 Settings Bar Buttons:');
    const settingsButtons = buttons.filter(btn => {
        const text = btn.textContent.trim();
        return text === '両' || text === 'S' || text === 'T' || btn.querySelector('svg[width="14"][height="14"]');
    });
    
    if (settingsButtons.length >= 4) {
        // 最初の3つのボタン間の間隔
        for (let i = 0; i < 3; i++) {
            if (i < settingsButtons.length - 1) {
                const rect1 = settingsButtons[i].getBoundingClientRect();
                const rect2 = settingsButtons[i + 1].getBoundingClientRect();
                const gap = Math.round(rect2.left - rect1.right);
                console.log(`  Button ${i+1} to ${i+2}: ${gap}px ${gap === 10 ? '✅' : '❌ Should be 10px'}`);
            }
        }
        
        // 3番目とテーマボタンの間隔（56px）
        if (settingsButtons.length >= 4) {
            const rect3 = settingsButtons[2].getBoundingClientRect();
            const rectTheme = settingsButtons[3].getBoundingClientRect();
            const groupGap = Math.round(rectTheme.left - rect3.right);
            console.log(`  Display buttons to Theme: ${groupGap}px ${groupGap === 56 ? '✅' : '❌ Should be 56px'}`);
        }
    }
    
    // 中央のボタン群
    console.log('\n📍 Center Buttons:');
    const centerButtons = buttons.filter(btn => {
        const text = btn.textContent.trim();
        return text.includes('履歴') || text.includes('要約') || text.includes('質問');
    });
    
    for (let i = 0; i < centerButtons.length - 1; i++) {
        const rect1 = centerButtons[i].getBoundingClientRect();
        const rect2 = centerButtons[i + 1].getBoundingClientRect();
        const gap = Math.round(rect2.left - rect1.right);
        console.log(`  ${centerButtons[i].textContent.trim()} to ${centerButtons[i+1].textContent.trim()}: ${gap}px ${gap === 10 ? '✅' : '❌ Should be 10px'}`);
    }
    
    // 右側のボタン群（HeaderControls）
    console.log('\n📍 Right Side Buttons (HeaderControls):');
    const headerControls = document.querySelector('[class*="HeaderControls"]');
    if (headerControls) {
        const rightButtons = Array.from(headerControls.querySelectorAll('button'));
        console.log(`  Found ${rightButtons.length} buttons in HeaderControls`);
        
        for (let i = 0; i < rightButtons.length - 1; i++) {
            const rect1 = rightButtons[i].getBoundingClientRect();
            const rect2 = rightButtons[i + 1].getBoundingClientRect();
            const gap = Math.round(rect2.left - rect1.right);
            const isBeforeClose = i === rightButtons.length - 2;
            const expectedGap = isBeforeClose ? 56 : 10;
            console.log(`  Button ${i+1} to ${i+2}: ${gap}px ${gap === expectedGap ? '✅' : '❌ Should be ' + expectedGap + 'px'}`);
        }
    }
    
    // コンテナのgap属性を確認
    console.log('\n📍 Container Gap Styles:');
    const containers = document.querySelectorAll('[style*="gap"]');
    containers.forEach((container, i) => {
        const style = container.getAttribute('style');
        const gapMatch = style.match(/gap:\s*([^;]+)/);
        if (gapMatch) {
            console.log(`  Container ${i+1}: gap=${gapMatch[1]}`);
        }
    });
}

// 実行
measureGaps();