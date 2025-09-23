// ボタンサイズチェックスクリプト
// Electronアプリのコンソールで実行して、ボタンサイズを確認

function checkButtonSizes() {
    console.log('=== Button Size Check ===');
    
    // すべてのボタンを取得
    const buttons = document.querySelectorAll('button');
    const results = [];
    
    buttons.forEach((button, index) => {
        const rect = button.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(button);
        const className = button.className;
        const text = button.textContent.trim() || button.title || 'No text';
        
        results.push({
            index,
            text: text.substring(0, 20),
            className: className.substring(0, 50),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            gap: computedStyle.marginLeft || '0'
        });
    });
    
    // 結果を表形式で表示
    console.table(results);
    
    // 問題のあるボタンを検出
    console.log('\n=== Issues Found ===');
    let issues = 0;
    
    results.forEach((button) => {
        // 標準ボタン（36x36）のチェック
        if (!button.className.includes('buttonCenter') && 
            !button.className.includes('buttonNav') &&
            !button.className.includes('recordingIndicator')) {
            if (button.width !== 36 || button.height !== 36) {
                console.error(`❌ Button "${button.text}" should be 36x36 but is ${button.width}x${button.height}`);
                issues++;
            }
        }
        
        // センターボタン（82x36）のチェック
        if (button.className.includes('buttonCenter')) {
            if (button.width !== 82 || button.height !== 36) {
                console.error(`❌ Center button "${button.text}" should be 82x36 but is ${button.width}x${button.height}`);
                issues++;
            }
        }
        
        // ナビボタン（32x32）のチェック
        if (button.className.includes('buttonNav')) {
            if (button.width !== 32 || button.height !== 32) {
                console.error(`❌ Nav button "${button.text}" should be 32x32 but is ${button.width}x${button.height}`);
                issues++;
            }
        }
    });
    
    if (issues === 0) {
        console.log('✅ All buttons have correct sizes!');
    } else {
        console.log(`❌ Found ${issues} issues`);
    }
    
    // Gap確認
    console.log('\n=== Gap Check ===');
    const containers = document.querySelectorAll('[style*="gap"]');
    containers.forEach((container) => {
        const gap = container.style.gap;
        console.log(`Container gap: ${gap}`, container.className || 'No class');
    });
}

// 実行
checkButtonSizes();