/**
 * 命名規則チェックスクリプト
 * 
 * このスクリプトは、致命的なバグを引き起こす可能性のある命名規則の不一致を検出します。
 * 特に、onとhandleの混同によるイベントハンドラの設定ミスを防ぎます。
 * 
 * 実行方法: node scripts/check-naming-conventions.js
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// 検出結果を格納
const violations = [];
const warnings = [];

// 対象ファイルパターン
const FILE_PATTERNS = [
  'src/**/*.{ts,tsx}',
  'electron/**/*.{ts,tsx}',
  '!**/*.d.ts',
  '!**/node_modules/**'
];

/**
 * ファイル内容を検査
 */
function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const fileName = path.relative(process.cwd(), filePath);

  // 1. イベントハンドラの命名規則チェック
  checkEventHandlers(fileName, lines);

  // 2. 言語固定のチェック
  checkHardcodedLanguages(fileName, lines);

  // 3. 重複する型定義のチェック
  checkDuplicateTypes(fileName, content);

  // 4. source/target vs original/translation の混在チェック
  checkTerminologyConsistency(fileName, lines);

  // 5. 未使用のサービスやインポートのチェック
  checkUnusedServices(fileName, content);
}

/**
 * イベントハンドラの命名規則チェック
 * 
 * 問題パターン:
 * - const onSomething = () => {} （関数定義にonプレフィックス）
 * - handleSomething: onSomething （プロパティ名とハンドラ名の不一致）
 */
function checkEventHandlers(fileName, lines) {
  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // パターン1: 関数定義でonプレフィックス
    const onFunctionPattern = /(?:const|let|var)\s+on[A-Z]\w+\s*=\s*(?:\(|async)/;
    if (onFunctionPattern.test(line)) {
      const match = line.match(/on[A-Z]\w+/);
      violations.push({
        file: fileName,
        line: lineNum,
        type: 'ERROR',
        issue: `Event handler function named with "on" prefix: ${match[0]}`,
        suggestion: `Rename to "handle${match[0].substring(2)}"`,
        severity: 'CRITICAL',
        example: `const ${match[0]} = () => {...} → const handle${match[0].substring(2)} = () => {...}`
      });
    }

    // パターン2: プロパティ名の不一致チェック
    const propPattern = /(\w+):\s*handle(\w+)/;
    const propMatch = line.match(propPattern);
    if (propMatch) {
      const propName = propMatch[1];
      const handlerSuffix = propMatch[2];
      
      // onXxx: handleYyy のような不一致をチェック
      if (propName.startsWith('on') && !propName.endsWith(handlerSuffix)) {
        violations.push({
          file: fileName,
          line: lineNum,
          type: 'ERROR',
          issue: `Property name mismatch: ${propName}: handle${handlerSuffix}`,
          suggestion: `Ensure consistency: on${handlerSuffix}: handle${handlerSuffix}`,
          severity: 'HIGH'
        });
      }
    }

    // パターン3: コールバックプロパティの誤用
    const callbackPattern = /on[A-Z]\w+\s*\?\s*:\s*\(/;
    if (callbackPattern.test(line) && !line.includes('interface') && !line.includes('type')) {
      const match = line.match(/on[A-Z]\w+/);
      warnings.push({
        file: fileName,
        line: lineNum,
        type: 'WARNING',
        issue: `Callback property definition found: ${match[0]}`,
        suggestion: 'Verify this is a property, not a function implementation'
      });
    }
  });
}

/**
 * ハードコードされた言語名のチェック
 */
function checkHardcodedLanguages(fileName, lines) {
  const hardcodedLanguages = ['japanese', 'english', 'Japanese', 'English'];
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    hardcodedLanguages.forEach(lang => {
      if (line.includes(lang) && !line.includes('//') && !line.includes('/*')) {
        // 文字列内での使用をチェック
        const stringPattern = new RegExp(`['"\`].*${lang}.*['"\`]`);
        const propPattern = new RegExp(`\\b${lang}\\b`);
        
        if (stringPattern.test(line) || propPattern.test(line)) {
          violations.push({
            file: fileName,
            line: lineNum,
            type: 'ERROR',
            issue: `Hardcoded language name: ${lang}`,
            suggestion: 'Use sourceLanguage/targetLanguage with ISO codes (e.g., "ja", "en")',
            severity: 'MEDIUM'
          });
        }
      }
    });
  });
}

/**
 * 重複する型定義のチェック
 */
function checkDuplicateTypes(fileName, content) {
  const typeDefinitions = [
    /interface\s+(\w+)/g,
    /type\s+(\w+)\s*=/g,
    /class\s+(\w+)/g
  ];

  const foundTypes = new Map();

  typeDefinitions.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const typeName = match[1];
      if (!foundTypes.has(typeName)) {
        foundTypes.set(typeName, []);
      }
      foundTypes.get(typeName).push({
        file: fileName,
        position: match.index
      });
    }
  });

  // 同一ファイル内での重複をチェック
  foundTypes.forEach((locations, typeName) => {
    if (locations.length > 1) {
      violations.push({
        file: fileName,
        type: 'ERROR',
        issue: `Duplicate type definition: ${typeName} (defined ${locations.length} times)`,
        suggestion: 'Remove duplicate definitions or merge them',
        severity: 'HIGH',
        locations: locations.map(loc => `Position: ${loc.position}`)
      });
    }
  });
}

/**
 * 用語の一貫性チェック
 */
function checkTerminologyConsistency(fileName, lines) {
  const oldTerms = ['original', 'translation', 'translated'];
  const newTerms = ['source', 'target'];
  
  const foundOldTerms = [];
  const foundNewTerms = [];

  lines.forEach((line, index) => {
    oldTerms.forEach(term => {
      if (line.toLowerCase().includes(term)) {
        foundOldTerms.push({ term, line: index + 1 });
      }
    });
    
    newTerms.forEach(term => {
      if (line.toLowerCase().includes(term)) {
        foundNewTerms.push({ term, line: index + 1 });
      }
    });
  });

  // 両方の用語が混在している場合
  if (foundOldTerms.length > 0 && foundNewTerms.length > 0) {
    warnings.push({
      file: fileName,
      type: 'WARNING',
      issue: 'Mixed terminology: both old (original/translation) and new (source/target) terms found',
      suggestion: 'Consistently use source/target throughout the file',
      oldTerms: foundOldTerms.length,
      newTerms: foundNewTerms.length
    });
  }
}

/**
 * 未使用のサービスやインポートのチェック
 */
function checkUnusedServices(fileName, content) {
  // SessionStorageServiceの使用状況
  if (content.includes('SessionStorageService') && !content.includes('sessionStorageService.')) {
    warnings.push({
      file: fileName,
      type: 'WARNING',
      issue: 'SessionStorageService imported but not used',
      suggestion: 'Remove unused import or implement data persistence',
      severity: 'MEDIUM'
    });
  }
}

/**
 * メイン実行関数
 */
function main() {
  console.log('🔍 命名規則チェック開始...\n');

  FILE_PATTERNS.forEach(pattern => {
    const files = glob.sync(pattern);
    files.forEach(checkFile);
  });

  // 結果の表示
  console.log('\n📊 検査結果:\n');

  if (violations.length > 0) {
    console.log('❌ 重大な問題が見つかりました:\n');
    violations.forEach((v, index) => {
      console.log(`${index + 1}. ${v.file}:${v.line || 'N/A'}`);
      console.log(`   種類: ${v.type} (深刻度: ${v.severity || 'N/A'})`);
      console.log(`   問題: ${v.issue}`);
      console.log(`   提案: ${v.suggestion}`);
      if (v.example) {
        console.log(`   例: ${v.example}`);
      }
      console.log();
    });
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  警告:\n');
    warnings.forEach((w, index) => {
      console.log(`${index + 1}. ${w.file}:${w.line || 'N/A'}`);
      console.log(`   問題: ${w.issue}`);
      console.log(`   提案: ${w.suggestion}`);
      console.log();
    });
  }

  if (violations.length === 0 && warnings.length === 0) {
    console.log('✅ 命名規則の問題は見つかりませんでした。');
  }

  // サマリー
  console.log('\n📈 サマリー:');
  console.log(`   重大な問題: ${violations.length}件`);
  console.log(`   警告: ${warnings.length}件`);

  // エラーコード
  process.exit(violations.length > 0 ? 1 : 0);
}

// 実行
if (require.main === module) {
  main();
}

module.exports = { checkFile, violations, warnings };