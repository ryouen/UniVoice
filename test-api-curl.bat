@echo off
setlocal

REM Load environment variables
for /f "tokens=1,2 delims==" %%a in (.env) do (
    if "%%a"=="OPENAI_API_KEY" set OPENAI_API_KEY=%%b
)

echo Testing OpenAI API with curl...
echo.

curl -X POST https://api.openai.com/v1/chat/completions ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer %OPENAI_API_KEY%" ^
  -d "{\"model\": \"gpt-3.5-turbo\", \"messages\": [{\"role\": \"user\", \"content\": \"Say hi\"}], \"max_tokens\": 10}"

echo.
echo.
echo If you see a 401 error above, the API key is invalid.
echo If you see a response with "choices", the API key is valid.