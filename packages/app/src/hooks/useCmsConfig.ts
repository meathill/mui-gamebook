import { useQuery } from '@tanstack/react-query';

interface CmsConfig {
  defaultAiProvider: 'google' | 'openai';
}

export function useCmsConfig() {
  return useQuery<CmsConfig>({
    queryKey: ['cms-config'],
    queryFn: async () => {
      const res = await fetch('/api/cms/config');
      if (!res.ok) {
        throw new Error('获取配置失败');
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5分钟缓存
  });
}

// OpenAI 支持的比例
export const OPENAI_ASPECT_RATIOS = [
  { value: '1:1', label: '1:1 (方形)' },
  { value: '3:2', label: '3:2 (横向)' },
  { value: '2:3', label: '2:3 (竖向)' },
];

// Google 支持的比例
export const GOOGLE_ASPECT_RATIOS = [
  { value: '1:1', label: '1:1 (方形)' },
  { value: '3:2', label: '3:2 (横向)' },
  { value: '2:3', label: '2:3 (竖向)' },
  { value: '16:9', label: '16:9 (宽屏)' },
  { value: '9:16', label: '9:16 (竖屏)' },
  { value: '4:3', label: '4:3 (传统)' },
  { value: '3:4', label: '3:4 (竖向传统)' },
  { value: '4:5', label: '4:5 (灵活)' },
  { value: '5:4', label: '5:4 (灵活)' },
  { value: '21:9', label: '21:9 (超宽)' },
];

export function getAspectRatios(provider: 'google' | 'openai' | undefined) {
  return provider === 'openai' ? OPENAI_ASPECT_RATIOS : GOOGLE_ASPECT_RATIOS;
}
