# Multilingual Mode 日本語認識問題の修正

## 問題の概要
- **症状**: UIでMultilingual modeを選択した際、英語は認識されるが日本語が認識されない
- **原因**: Deepgram Nova-3では日本語認識に`language=multi`パラメータが必要だが、UIで日本語を選択すると`language=ja`が送信されていた

## 根本原因
1. **Deepgram Nova-3の仕様**:
   - 10言語（英語、スペイン語、フランス語、ドイツ語、ヒンディー語、ロシア語、ポルトガル語、日本語、イタリア語、オランダ語）をサポート
   - これらの言語を使用するには`language=multi`パラメータが必須
   - 個別の言語コード（`language=ja`など）は使用できない

2. **実装の問題**:
   - UIで言語を選択すると、その言語コードがそのままDeepgramに送信されていた
   - 日本語選択時に`ja`が送信され、Nova-3では認識されなかった

## 修正内容

### 1. DeepgramStreamAdapter.ts の修正
`buildWebSocketUrl`メソッドを以下のように修正:

```typescript
private buildWebSocketUrl(): string {
  const params = new URLSearchParams({
    model: this.config.model,
    interim_results: String(this.config.interim),
    endpointing: String(this.config.endpointing),
    utterance_end_ms: String(this.config.utteranceEndMs),
    sample_rate: String(this.config.sampleRate),
    channels: '1',
    encoding: 'linear16',
    punctuate: 'true'
  });
  
  if (this.config.smartFormat) {
    params.append('smart_format', 'true');
  }
  
  if (this.config.noDelay) {
    params.append('no_delay', 'true');
  }
  
  // Language parameter handling
  if (this.config.sourceLanguage) {
    let languageParam = this.config.sourceLanguage;
    
    // Nova-3 requires 'multi' for multilingual support including Japanese
    if (this.config.model === 'nova-3' || this.config.model === 'nova-3-ea') {
      // Languages that require 'multi' parameter in Nova-3
      const multilingualLanguages = ['ja', 'hi', 'ru', 'it', 'es', 'fr', 'de', 'pt', 'nl'];
      
      if (multilingualLanguages.includes(this.config.sourceLanguage) || this.config.sourceLanguage === 'multi') {
        languageParam = 'multi';
        this.componentLogger?.info('Nova-3 multilingual mode activated', {
          originalLanguage: this.config.sourceLanguage,
          languageParam: 'multi'
        });
      }
    }
    
    params.append('language', languageParam);
  }
  
  return `wss://api.deepgram.com/v1/listen?${params}`;
}
```

### 2. 主な変更点
- Nova-3モデル使用時、特定の言語（日本語を含む）が選択された場合、自動的に`language=multi`に変換
- パラメータの設定順序を修正（smart_formatとno_delayをlanguageの前に移動）
- 重複したロジックと過剰なログ出力を削除
- より明確なログメッセージを追加

## テスト方法

### 1. コンソールログで確認
アプリケーション起動後、DevToolsのコンソールで以下のログを確認:
- `[DeepgramAdapter] Nova-3 multilingual mode activated`が表示される
- `languageParam: 'multi'`となっている

### 2. 実際の動作確認
1. UIで「日本語」を選択
2. 音声認識を開始
3. 日本語で話す
4. 正しく文字起こしされることを確認

### 3. WebSocket URLの確認
ログに出力されるWebSocket URLで`language=multi`パラメータが含まれていることを確認

## 影響範囲
- この修正はDeepgramStreamAdapter内で完結しており、他のコンポーネントへの影響はない
- UI側の変更は不要（ユーザーは従来通り言語を選択できる）
- 英語のみを使用する場合は従来通り`language=en`が使用される

## 参考資料
- [Deepgram Multilingual Code Switching Documentation](https://developers.deepgram.com/docs/multilingual-code-switching)
- [Nova-3 Model Documentation](https://developers.deepgram.com/docs/models-languages-overview)