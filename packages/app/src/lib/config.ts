import type {
  ImageProviderType,
  MusicProviderType,
  SfxProviderType,
  SttProviderType,
  TextProviderType,
  TtsProviderType,
  VideoProviderType,
} from '@mui-gamebook/core/lib/ai-provider';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export interface AppConfig {
  dailyTokenLimit: number;
  /** 默认文本生成提供者 */
  defaultTextProvider: TextProviderType;
  /** 默认 AI 文本提供者别名（兼容旧接口） */
  defaultAiProvider: TextProviderType;
  /** 默认 TTS 语音合成提供者 */
  defaultTtsProvider: TtsProviderType;
  /** 默认图片生成提供者 */
  defaultImageProvider: ImageProviderType;
  /** 默认视频生成提供者 */
  defaultVideoProvider: VideoProviderType;
  /** 默认语音识别提供者 */
  defaultSttProvider: SttProviderType;
  /** 默认音乐生成提供者 */
  defaultMusicProvider: MusicProviderType;
  /** 默认音效生成提供者 */
  defaultSfxProvider: SfxProviderType;
  /** 音乐模型 */
  musicModel: string;
  /** 音效模型 */
  sfxModel: string;
  /** OpenCode Go 文本模型 */
  opencodeTextModel: string;
  /** OpenCode Go base URL */
  opencodeBaseUrl: string;
  /** Google AI 文本模型 */
  googleTextModel: string;
  /** Google AI 图片模型 */
  googleImageModel: string;
  /** Google AI TTS 模型 */
  googleTtsModel: string;
  /** Google AI 视频模型 */
  googleVideoModel: string;
  /** Google AI 语音识别模型 */
  googleSttModel: string;
  /** OpenAI 文本模型 */
  openaiTextModel: string;
  /** OpenAI 图片模型 */
  openaiImageModel: string;
  /** OpenAI TTS 模型 */
  openaiTtsModel: string;
  /** OpenAI 视频模型 */
  openaiVideoModel: string;
  /** OpenAI 语音识别模型 */
  openaiSttModel: string;
  /** 小米 MiMo 文本模型 */
  mimoTextModel: string;
  /** 小米 MiMo base URL */
  mimoBaseUrl: string;
  /** 小米 MiMo TTS 模型 */
  mimoTtsModel: string;
  /** 小米 MiMo 语音识别模型 */
  mimoSttModel: string;
  /** Anthropic Claude 文本模型 */
  anthropicTextModel: string;
  /** Cloudflare AI Gateway 基础地址 */
  cfAiGatewayBaseUrl: string;
}

const CONFIG_KEY = 'app:config';

/**
 * 已从 AppConfig 移除、但可能残留在 KV 里的字段。
 * 合并时显式剔除，避免旧值重新进入配置对象。
 */
const LEGACY_CONFIG_KEYS = ['videoWhitelist', 'adminUserIds'] as const;

/**
 * 从环境变量装配各模态的基准配置
 * 基准值全部由 wrangler.jsonc (vars) 注入，不再在代码中写死兜底
 */
export function getEnvDefaults(envMap?: unknown): AppConfig {
  const env = (envMap || (typeof process !== 'undefined' ? process.env : {}) || {}) as Record<string, unknown>;
  const defaultTextProvider =
    (env.DEFAULT_TEXT_PROVIDER as TextProviderType) || (env.DEFAULT_AI_PROVIDER as TextProviderType) || 'opencode';

  return {
    dailyTokenLimit: Number(env.DAILY_TOKEN_LIMIT) || 100000,
    defaultTextProvider,
    defaultAiProvider: defaultTextProvider,
    defaultTtsProvider: (env.DEFAULT_TTS_PROVIDER as TtsProviderType) || 'mimo',
    defaultImageProvider: (env.DEFAULT_IMAGE_PROVIDER as ImageProviderType) || 'google',
    defaultVideoProvider: (env.DEFAULT_VIDEO_PROVIDER as VideoProviderType) || 'google',
    defaultSttProvider: (env.DEFAULT_STT_PROVIDER as SttProviderType) || 'openai',
    defaultMusicProvider: (env.DEFAULT_MUSIC_PROVIDER as MusicProviderType) || 'internal',
    defaultSfxProvider: (env.DEFAULT_SFX_PROVIDER as SfxProviderType) || 'internal',
    musicModel: (env.MUSIC_MODEL as string) || 'suno-v4',
    sfxModel: (env.SFX_MODEL as string) || 'eleven-sfx-v1',
    opencodeBaseUrl: (env.OPENCODE_BASE_URL as string) || 'https://opencode.ai/zen/go/v1',
    opencodeTextModel: (env.OPENCODE_TEXT_MODEL as string) || 'deepseek-v4.1-flash',
    googleTextModel: (env.GOOGLE_TEXT_MODEL as string) || (env.GOOGLE_MODEL as string) || 'gemini-3.8-flash',
    googleImageModel: (env.GOOGLE_IMAGE_MODEL as string) || 'gemini-3.1-flash-lite-image',
    googleTtsModel: (env.GOOGLE_TTS_MODEL as string) || 'gemini-3.1-flash-tts-preview',
    googleVideoModel: (env.GOOGLE_VIDEO_MODEL as string) || 'veo-3.1-fast-generate-preview',
    googleSttModel: (env.GOOGLE_STT_MODEL as string) || 'gemini-3-flash-transcribe',
    openaiTextModel: (env.OPENAI_TEXT_MODEL as string) || 'gpt-5.6-luna',
    openaiImageModel: (env.OPENAI_IMAGE_MODEL as string) || 'gpt-image-2.5-sunburst',
    openaiTtsModel: (env.OPENAI_TTS_MODEL as string) || 'gpt-4o-mini-tts',
    openaiVideoModel: (env.OPENAI_VIDEO_MODEL as string) || '',
    openaiSttModel: (env.OPENAI_STT_MODEL as string) || 'whisper-1',
    mimoTextModel: (env.MIMO_TEXT_MODEL as string) || 'mimo-v2.5-pro',
    mimoBaseUrl: (env.MIMO_BASE_URL as string) || 'https://token-plan-cn.xiaomimimo.com/v1',
    mimoTtsModel: (env.MIMO_TTS_MODEL as string) || 'mimo-v2.5-tts',
    mimoSttModel: (env.MIMO_STT_MODEL as string) || 'mimo-v2.5-asr',
    anthropicTextModel: (env.ANTHROPIC_TEXT_MODEL as string) || 'claude-sonnet-5',
    cfAiGatewayBaseUrl: (env.CF_AI_GATEWAY_BASE_URL as string) || '',
  };
}

/**
 * 获取全局配置
 * 以环境变量为基准，叠加 KV 存储的管理端覆盖值
 */
export async function getConfig(): Promise<AppConfig> {
  try {
    const { env } = getCloudflareContext();
    const defaults = getEnvDefaults(env);
    const kv = env.KV;

    const stored = await kv?.get<Partial<AppConfig>>(CONFIG_KEY, 'json');
    if (stored) {
      const textProvider =
        stored.defaultTextProvider ||
        (stored as { defaultAiProvider?: TextProviderType }).defaultAiProvider ||
        defaults.defaultTextProvider;

      const merged = {
        ...defaults,
        ...stored,
        defaultTextProvider: textProvider,
        defaultAiProvider: textProvider,
      };
      for (const key of LEGACY_CONFIG_KEYS) {
        delete (merged as Record<string, unknown>)[key];
      }

      return merged;
    }

    return defaults;
  } catch (error) {
    console.error('[Config] 获取配置失败:', error);
    return getEnvDefaults(process.env);
  }
}

/**
 * 更新全局配置
 */
export async function updateConfig(config: Partial<AppConfig>): Promise<void> {
  try {
    const { env } = getCloudflareContext();
    const kv = env.KV;

    const current = await getConfig();
    const newConfig = { ...current, ...config };

    await kv.put(CONFIG_KEY, JSON.stringify(newConfig));
    console.log('[Config] 配置已更新:', newConfig);
  } catch (error) {
    console.error('[Config] 更新配置失败:', error);
    throw error;
  }
}
