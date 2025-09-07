# ASR/Translation イベント修正計画

## 問題
UniVoice 2.0で音声文字起こしが表示されない

## 根本原因
- UniVoice 2.0の`UnifiedPipelineService`で`currentOriginalUpdate`と`currentTranslationUpdate`イベントが発行されていない
- これらのイベントは親フォルダ（UniVoice 1.0）で使用されており、UI表示に必要

## 修正方針
1. Deepgramからの音声認識結果受信時に`currentOriginalUpdate`イベントを発行
2. OpenAIからの翻訳結果受信時に`currentTranslationUpdate`イベントを発行
3. IPCGatewayを通じてこれらのイベントをレンダラープロセスに転送

## 親フォルダの実装（参考）
```typescript
// 音声認識結果受信時
this.emit('currentOriginalUpdate', {
  text: segment.text,
  isFinal: segment.isFinal
});

// 翻訳結果受信時  
this.emit('currentTranslationUpdate', translatedText);
```