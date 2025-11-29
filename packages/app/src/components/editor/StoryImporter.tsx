import { useState, useMemo } from 'react';
import { X, Sparkles, Loader2Icon, Lightbulb } from 'lucide-react';
import { useDialog } from '@/components/Dialog';

// AI 故事创作引导提示
const STORY_PROMPTS = [
  {
    title: '经典故事新视角',
    description: '以《哈利波特》世界为例，我们可以选择一个不同的视角。比如纳威·隆巴顿，他在霍格沃茨会经历什么？他有没有可能成为找到魔法石的关键人物？或者成为击败伏地魔的英雄？换个主角，一个熟悉的世界会变得截然不同。',
    example: '故事设定在霍格沃茨魔法学校，主角是纳威·隆巴顿，一个害羞但勇敢的男孩。当哈利波特忙于追踪伏地魔时，纳威意外发现了一个关于自己父母的秘密...',
  },
  {
    title: '历史关键时刻',
    description: '选择一个历史上的关键时刻，让玩家做出不同的选择。比如在三国时期的赤壁之战前夜，如果你是诸葛亮，你会如何说服孙权联盟？不同的对话选择会导致完全不同的历史走向。',
    example: '公元208年，曹操率领八十万大军南下。作为刘备的军师诸葛亮，你被派往东吴说服孙权联合抗曹。在江东的朝堂上，你将面对众多质疑者...',
  },
  {
    title: '日常生活冒险',
    description: '有时候最好的故事就在我们身边。想象一下：一个普通的上班族在地铁上捡到一个神秘的U盘，里面的内容将彻底改变他的生活。每一个选择都可能让主角走向完全不同的结局。',
    example: '周一早晨，你像往常一样挤上拥挤的地铁。突然，你注意到座位上有一个被遗落的U盘。当你把它插进电脑时，屏幕上出现了一段加密视频...',
  },
  {
    title: '生存挑战',
    description: '荒野求生类型的故事非常适合互动小说。玩家需要在资源有限的情况下做出艰难的选择：是冒险寻找水源，还是留在原地等待救援？每个决定都关系到生死存亡。',
    example: '你的飞机坠毁在一座荒岛上。除了一把小刀和半瓶水，你什么都没有。远处的丛林深处传来了奇怪的声音。太阳即将落山，你必须做出选择...',
  },
  {
    title: '悬疑推理',
    description: '一个好的推理故事需要线索、嫌疑人和意想不到的结局。玩家扮演侦探，通过询问证人、检查现场来寻找真相。错误的推理可能会让真凶逍遥法外，甚至让无辜者蒙冤。',
    example: '豪华别墅的书房里，著名收藏家被发现死在自己的椅子上。门窗紧锁，没有任何暴力痕迹。作为被请来的私家侦探，你注意到桌上的茶杯还冒着热气...',
  },
];

interface Props {
  id: string;
  onImport: (script: string) => void;
  onClose: () => void;
}

export default function StoryImporter({ id, onImport, onClose }: Props) {
  const [story, setStory] = useState('');
  const [loading, setLoading] = useState(false);
  const dialog = useDialog();

  // 随机选择一个提示
  const randomPrompt = useMemo(() => {
    const index = Math.floor(Math.random() * STORY_PROMPTS.length);
    return STORY_PROMPTS[index];
  }, []);

  const handleGenerate = async () => {
    if (!story.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/cms/games/${id}/generate-script`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ story }),
      });

      if (!res.ok) {
        const data = (await res.json()) as {
          error: string;
        };
        throw new Error(data.error || '生成失败');
      }

      const data = (await res.json()) as {
        script: string;
      };
      onImport(data.script);
      onClose();
    } catch (e: unknown) {
      await dialog.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleUseExample = () => {
    setStory(randomPrompt.example);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="text-purple-500" />
            AI 故事导入器
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
        </div>

        {/* 创作引导 */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 mb-4 border border-purple-100">
          <div className="flex items-start gap-3">
            <Lightbulb className="text-purple-500 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <h3 className="font-semibold text-purple-900 mb-1">{randomPrompt.title}</h3>
              <p className="text-sm text-purple-700 mb-3">{randomPrompt.description}</p>
              <button
                onClick={handleUseExample}
                className="text-xs text-purple-600 hover:text-purple-800 underline"
              >
                使用此示例开始创作 →
              </button>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          在下方输入你的故事大纲或完整故事。AI 会将其转换为可玩的互动游戏脚本，包含场景、选项和分支剧情。
        </p>

        <textarea
          value={story}
          onChange={e => setStory(e.target.value)}
          className="w-full h-64 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 resize-none mb-4"
          placeholder="在这里输入你的故事..."
        />

        <div className="flex justify-end">
          <button
            onClick={handleGenerate}
            disabled={loading || !story.trim()}
            className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
            type="button"
          >
            {loading && <Loader2Icon className="animate-spin size-4" />}
            {loading ? '生成中...' : '生成游戏脚本'}
          </button>
        </div>
      </div>
    </div>
  );
}
