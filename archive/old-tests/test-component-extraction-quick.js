/**
 * コンポーネント抽出の簡易動作確認
 * 
 * SetupSectionとRealtimeSectionが正しく動作するか確認
 */

console.log('🧪 Clean Architecture コンポーネント抽出テスト');
console.log('=====================================\n');

// テスト1: ファイルの存在確認
console.log('📁 Test 1: ファイルの存在確認');
const fs = require('fs');
const path = require('path');

const filesToCheck = [
  'src/presentation/components/UniVoice/sections/SetupSection/SetupSection.tsx',
  'src/presentation/components/UniVoice/sections/SetupSection/ClassSelector.tsx',
  'src/presentation/components/UniVoice/sections/SetupSection/index.ts',
  'src/presentation/components/UniVoice/sections/RealtimeSection/RealtimeSection.tsx',
  'src/presentation/components/UniVoice/sections/RealtimeSection/ThreeLineDisplay.tsx',
  'src/presentation/components/UniVoice/sections/RealtimeSection/index.ts',
  'src/components/UniVoice.tsx'
];

let allFilesExist = true;
filesToCheck.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
});

console.log(`\n結果: ${allFilesExist ? '✅ 全ファイルが存在' : '❌ 一部ファイルが不足'}\n`);

// テスト2: インポートの確認
console.log('📦 Test 2: インポートの確認');
const univoiceContent = fs.readFileSync('src/components/UniVoice.tsx', 'utf8');

const requiredImports = [
  'SetupSection',
  'RealtimeSection'
];

let allImportsFound = true;
requiredImports.forEach(importName => {
  const found = univoiceContent.includes(`import { ${importName} }`) || 
                univoiceContent.includes(`import ${importName}`);
  console.log(`  ${found ? '✅' : '❌'} ${importName} のインポート`);
  if (!found) allImportsFound = false;
});

console.log(`\n結果: ${allImportsFound ? '✅ 全インポートが正しい' : '❌ インポートに問題あり'}\n`);

// テスト3: コンポーネントの使用確認
console.log('🔧 Test 3: コンポーネントの使用確認');

const componentUsages = [
  '<SetupSection',
  '<RealtimeSection'
];

let allComponentsUsed = true;
componentUsages.forEach(usage => {
  const found = univoiceContent.includes(usage);
  console.log(`  ${found ? '✅' : '❌'} ${usage} の使用`);
  if (!found) allComponentsUsed = false;
});

console.log(`\n結果: ${allComponentsUsed ? '✅ 全コンポーネントが使用されている' : '❌ 未使用のコンポーネントあり'}\n`);

// テスト4: 型定義の確認
console.log('📝 Test 4: 型定義の確認');

const typeDefinitions = [
  'SetupSectionProps',
  'RealtimeSectionProps',
  'ThreeLineDisplayProps'
];

let allTypesFound = true;
typeDefinitions.forEach(typeName => {
  // 各ファイルで型定義を探す
  let found = false;
  filesToCheck.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes(`interface ${typeName}`) || content.includes(`type ${typeName}`)) {
        found = true;
      }
    }
  });
  console.log(`  ${found ? '✅' : '❌'} ${typeName} の定義`);
  if (!found) allTypesFound = false;
});

console.log(`\n結果: ${allTypesFound ? '✅ 全型定義が存在' : '❌ 型定義に問題あり'}\n`);

// テスト5: 削除されたコードの確認
console.log('🗑️ Test 5: 削除されたコードの確認');

const removedPatterns = [
  '{/* 現在のセクション（固定） */}\\s*<div style={{\\s*height: \'44vh\'',
  'currentDisplay\\.original\\.oldest',
  'currentDisplay\\.translation\\.oldest'
];

let allPatternsRemoved = true;
removedPatterns.forEach(pattern => {
  const regex = new RegExp(pattern);
  const found = regex.test(univoiceContent);
  console.log(`  ${!found ? '✅' : '❌'} 古いコードパターンが${found ? '残存' : '削除済み'}`);
  if (found) allPatternsRemoved = false;
});

console.log(`\n結果: ${allPatternsRemoved ? '✅ 古いコードは適切に削除' : '❌ 古いコードが残存'}\n`);

// 総合結果
console.log('=====================================');
console.log('📊 総合結果:');
const allTestsPassed = allFilesExist && allImportsFound && allComponentsUsed && allTypesFound && allPatternsRemoved;
console.log(`  ${allTestsPassed ? '✅ 全テスト合格' : '❌ 一部テストに失敗'}`);

// 次のステップの提案
console.log('\n💡 次のステップ:');
if (allTestsPassed) {
  console.log('  1. npm run dev でアプリケーションを起動して手動確認');
  console.log('  2. SetupSectionでセッション開始が動作するか確認');
  console.log('  3. RealtimeSectionでリアルタイム表示が動作するか確認');
  console.log('  4. HistorySectionの抽出を継続');
} else {
  console.log('  1. 失敗したテストの原因を調査');
  console.log('  2. 必要な修正を実施');
  console.log('  3. 再度このテストを実行');
}

console.log('\n✨ テスト完了');