#!/usr/bin/env python3
"""压缩为 WebP、上传并 apply 一个已领取的素材。
用法: upload.py <gameId> <assetId> <claim.json> <image>
claim.json 为 claimMediaAssistanceItem 的返回（含 input_hash / executionToken）。"""
import hashlib, json, os, subprocess, sys
from PIL import Image

g, aid, claim_path, src = int(sys.argv[1]), sys.argv[2], sys.argv[3], sys.argv[4]
c = json.load(open(claim_path))
out = os.path.splitext(src)[0] + '.webp'
im = Image.open(src).convert('RGB'); im.thumbnail((1600, 1600)); im.save(out, 'WEBP', quality=80, method=6)
data = open(out, 'rb').read()
url = f"https://muistory.com/api/agent/media-assistance/upload?gameId={g}&inputHash={c['input_hash']}"
r = subprocess.run(['curl', '-s', '-X', 'POST', url,
    '-H', f"Authorization: Bearer {os.environ['MUISTORY_ACCESS_TOKEN']}",
    '-H', f"X-Execution-Token: {c.get('executionToken', '')}", '-H', 'Content-Type: image/webp',
    '-H', 'X-Content-SHA256: ' + hashlib.sha256(data).hexdigest(), '--data-binary', '@' + out],
    capture_output=True, text=True).stdout
print('upload', r[:300])
here = os.path.dirname(os.path.abspath(__file__))
args = json.dumps({'gameId': g, 'assetId': aid, 'inputHash': c['input_hash']})
print('apply', subprocess.run(['bash', f'{here}/mcp.sh', 'applyMediaAssistanceAsset', args], capture_output=True, text=True).stdout[:300])
