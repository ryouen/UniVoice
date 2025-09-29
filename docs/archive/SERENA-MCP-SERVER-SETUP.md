# Serena MCP Server Setup Guide

このドキュメントは、Windows 11環境でのSerena MCP Serverの完全な設定手順を記録したものです。

## 問題と解決

### 初期状態
- Serena MCP Serverは`.mcp.json`に設定されていたが接続エラー
- 実行ファイルパスが`C:\Users\ryosu\.local\bin\serena-mcp-server.exe`を指定していたが存在しなかった

### 解決方法
uvxを使用した動的実行に変更することで解決しました。

## 最終的な設定

### `.mcp.json`の内容
```json
{
  "mcpServers": {
    "serena": {
      "command": "uvx",
      "args": [
        "--from",
        "git+https://github.com/oraios/serena",
        "serena-mcp-server",
        "--context",
        "ide-assistant",
        "--project",
        "."
      ]
    }
  }
}
```

### 重要なポイント

1. **uvxコマンド**: `uvx`はPythonパッケージをインストールせずに直接実行できるツール
2. **動的実行**: GitHubから最新版を都度取得して実行するため、アップデートが自動的
3. **プロジェクト指定**: `--project .`で現在のディレクトリをプロジェクトとして指定

## 確認方法

```bash
# MCPサーバーの状態を確認
claude mcp list
```

正常に動作している場合の出力:
```
github: cmd /c npx -y @modelcontextprotocol/server-github@latest - ✓ Connected
serena: uvx --from git+https://github.com/oraios/serena serena-mcp-server --context ide-assistant --project . - ✓ Connected
```

## 利用可能なSerenaツール

`.claude\settings.local.json`に記載されているSerenaツール:
- `mcp__serena__onboarding`
- `mcp__serena__list_dir`
- `mcp__serena__get_symbols_overview`
- `mcp__serena__think_about_collected_information`
- `mcp__serena__find_symbol`
- `mcp__serena__write_memory`
- `mcp__serena__think_about_task_adherence`
- `mcp__serena__read_memory`
- `mcp__serena__search_for_pattern`
- `mcp__serena__find_file`
- `mcp__serena__list_memories`
- `mcp__serena__think_about_whether_you_are_done`
- `mcp__serena__replace_symbol_body`
- `mcp__serena__find_referencing_symbols`
- `mcp__serena__check_onboarding_performed`
- `mcp__serena__insert_after_symbol`

## 次回のセッション時

この設定は`.mcp.json`に保存されているため、次回Claude Codeを起動した際も自動的に有効になります。特別な操作は不要です。

## トラブルシューティング

もし接続エラーが発生した場合:

1. uvが正しくインストールされているか確認
   ```bash
   where uv
   # 出力例: C:\Users\ryosu\.local\bin\uv.exe
   ```

2. 手動でSerenaを実行してみる
   ```bash
   uvx --from git+https://github.com/oraios/serena serena-mcp-server --help
   ```

3. Claude Codeを再起動
   ```bash
   claude restart
   ```

## 更新日
2025-09-20