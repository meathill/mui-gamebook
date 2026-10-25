#!/usr/bin/env bash
# 用法: mcp.sh <toolName> '<json args>'   需要环境变量 MUISTORY_ACCESS_TOKEN（不要打印）
set -euo pipefail
body=$(python3 -c 'import json,sys;print(json.dumps({"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":sys.argv[1],"arguments":json.loads(sys.argv[2])}}))' "$1" "${2:-{\}}")
curl -s -H "Authorization: Bearer $MUISTORY_ACCESS_TOKEN" -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" "${MUISTORY_MCP_URL:-https://muistory.com/api/mcp/media-assistance}" -d "$body" \
  | sed 's/^data: //' | grep '^{' \
  | python3 -c 'import json,sys;d=json.load(sys.stdin);r=d.get("result",d);print(r["content"][0]["text"] if "content" in r else json.dumps(r,ensure_ascii=False))'
