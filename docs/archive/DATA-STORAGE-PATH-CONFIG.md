# UniVoiceデータ保存パス設定ガイド

## 概要
UniVoice 2.0では、OneDriveフォルダではなく、ローカルの専用フォルダにデータを保存します。

## デフォルトの保存場所

### Windows
```
C:\Users\{username}\UniVoice\
```

### Mac/Linux
```
~/UniVoice/
```

## カスタムパスの設定方法

### 方法1: 環境変数を使用（推奨）

#### Windows (PowerShell)
```powershell
# 一時的に設定
$env:UNIVOICE_DATA_PATH = "D:\MyData\UniVoice"

# 永続的に設定（ユーザー環境変数）
[Environment]::SetEnvironmentVariable("UNIVOICE_DATA_PATH", "D:\MyData\UniVoice", "User")
```

#### Windows (コマンドプロンプト)
```cmd
# 一時的に設定
set UNIVOICE_DATA_PATH=D:\MyData\UniVoice

# 永続的に設定
setx UNIVOICE_DATA_PATH "D:\MyData\UniVoice"
```

#### Mac/Linux
```bash
# .bashrc または .zshrc に追加
export UNIVOICE_DATA_PATH="/home/user/Documents/UniVoice"
```

### 方法2: .envファイルを使用

UniVoiceフォルダ内の`.env`ファイルに追加：
```
UNIVOICE_DATA_PATH=C:\MyData\UniVoice
```

## フォルダ構造

```
C:\Users\{username}\UniVoice\  （または指定したカスタムパス）
├── 経営学\
│   ├── 20250824_第1回\
│   │   ├── metadata.json
│   │   ├── history.json
│   │   ├── summary.json
│   │   └── vocabulary.json
│   └── course-metadata.json
├── データ構造とアルゴリズム\
│   └── ...
└── システム設定.json （将来実装予定）
```

## 既存データの移行

### OneDriveからの移行手順

1. **UniVoiceを終了**

2. **既存データをコピー**
   ```powershell
   # PowerShellで実行
   $source = "$env:USERPROFILE\OneDrive\Documents\UniVoiceData"
   $dest = "$env:USERPROFILE\UniVoice"
   
   # フォルダ作成
   New-Item -ItemType Directory -Path $dest -Force
   
   # データコピー
   Copy-Item -Path "$source\*" -Destination $dest -Recurse -Force
   ```

3. **UniVoiceを起動**
   - 新しい場所にデータが保存されるようになります

## 注意事項

1. **バックアップ**
   - OneDriveと異なり、自動バックアップされません
   - 定期的に手動でバックアップすることを推奨

2. **アクセス権限**
   - 指定したフォルダに書き込み権限が必要です

3. **ディスク容量**
   - 音声データや履歴が蓄積されるため、十分な空き容量を確保してください

## トラブルシューティング

### データが見つからない場合
1. 環境変数が正しく設定されているか確認
   ```powershell
   echo $env:UNIVOICE_DATA_PATH
   ```

2. フォルダのアクセス権限を確認

3. アプリケーションログを確認
   - ログに「Using custom data path」または「Using default data path」が表示される

---

最終更新: 2025年8月24日
作成者: Claude Code