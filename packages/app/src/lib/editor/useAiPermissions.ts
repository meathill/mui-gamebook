/**
 * 编辑器侧读取当前用户 AI 权限的 hook
 */
import type { AiProviderType } from '@mui-gamebook/core/lib/ai-provider';
import { useQuery } from '@tanstack/react-query';
import type { AiPermissions } from '@/lib/ai-permissions';

interface CmsConfigResponse {
  defaultAiProvider: AiProviderType;
  aiPermissions: AiPermissions;
}

/** 提供者的用户可读名称 */
export const AI_PROVIDER_LABELS: Record<AiProviderType, string> = {
  mimo: 'MiMo',
  anthropic: 'Claude',
  google: 'Gemini',
  openai: 'GPT',
};

const FALLBACK_PERMISSIONS: AiPermissions = {
  providers: ['mimo'],
  canGenerateImage: false,
  canGenerateVideo: false,
};

export function useAiPermissions() {
  const { data, isLoading } = useQuery<CmsConfigResponse>({
    queryKey: ['cms-config'],
    queryFn: async () => {
      const res = await fetch('/api/cms/config');
      if (!res.ok) throw new Error('获取配置失败');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const permissions = data?.aiPermissions ?? FALLBACK_PERMISSIONS;

  return {
    isLoading,
    providers: permissions.providers,
    canGenerateImage: permissions.canGenerateImage,
    canGenerateVideo: permissions.canGenerateVideo,
  };
}
