@echo off
echo ========================================
echo   UniVoice 2.0 クリーン起動スクリプト
echo ========================================
echo.

echo [1/3] 環境確認中...
if not exist .env (
    echo ❌ .envファイルが見つかりません
    echo .env.exampleをコピーして、APIキーを設定してください
    pause
    exit /b 1
)
echo ✅ .envファイル確認済み

echo.
echo [2/3] 開発サーバー起動中...
echo 新しいウィンドウでViteサーバーが起動します
start "UniVoice Dev Server" cmd /k "npm run dev"

echo.
echo [3/3] 5秒後にElectronアプリを起動します...
timeout /t 5 /nobreak > nul

echo Electronアプリを起動中...
start "UniVoice Electron" cmd /k "npm run electron"

echo.
echo ========================================
echo ✅ 起動完了！
echo.
echo 📝 UI変更内容:
echo - リアルタイム表示が見やすくなりました
echo - 文字サイズ: 18px（以前は15px）
echo - 背景色付きで視認性向上
echo - ラベル追加（🎤 音声認識、🌐 翻訳）
echo.
echo 🔍 確認ポイント:
echo 1. リアルタイム文字起こしセクションの表示
echo 2. 文字の大きさと読みやすさ
echo 3. 左右のレイアウト
echo ========================================
echo.
pause