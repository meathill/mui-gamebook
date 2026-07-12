## 功能

### 语音生成

语音可以通过以下方式生成：

1. **编辑器手动生成**：在编辑器中点击"生成语音"按钮
2. **批量生成**：使用 `asset-generator` 命令行工具

**命令行生成：**
```bash
cd packages/asset-generator
pnpm generate remote <game-id>  # 生成所有素材（包括 TTS）
pnpm generate remote <game-id> --force  # 强制重新生成
```

**声音选项：**

命令行批量生成（`asset-generator`）和编辑器手动生成使用两套独立的音色配置，互不影响：

- **命令行批量生成**：通过环境变量 `DEFAULT_TTS_VOICE` 设置默认声音，仅支持 Google/Gemini 音色：
  - `Aoede` - 温和女声（默认，推荐儿童故事）
  - `Kore` - 活泼女声
  - `Puck` - 活泼男声
  - `Leda` - 温柔女声
  - `Charon` - 沉稳男声
- **编辑器手动生成**：在每个角色的表单中单独选择 TTS provider（`mimo` / `google` / `openai`，默认 `mimo`）和对应的音色，随角色数据保存，与 `DEFAULT_TTS_VOICE` 无关


## Tips

- 在创建游戏前，建议先配置好 `ai.style` 和 `ai.characters`，这样后续生成的所有素材都会保持一致的风格。
- 在编辑器中，输入 `@` 会弹出角色选择列表，选择后会显示高亮的角色名称标签，提供类似聊天软件的 @ 提及体验。
