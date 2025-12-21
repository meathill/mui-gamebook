'use client';

interface GameStartScreenProps {
  title: string;
  description?: string;
  coverImage?: string;
  onStart: () => void;
}

/**
 * 游戏开始画面
 */
export default function GameStartScreen({ title, description, coverImage, onStart }: GameStartScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      {/* 封面图 */}
      {coverImage && (
        <div className="w-full max-w-md mb-6 rounded-2xl overflow-hidden shadow-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverImage}
            alt={title}
            className="w-full h-48 object-cover"
          />
        </div>
      )}

      {/* 装饰 */}
      <div className="flex gap-3 text-4xl mb-6">
        <span className="animate-bounce-in">✨</span>
        <span
          className="animate-bounce-in"
          style={{ animationDelay: '0.1s' }}>
          📖
        </span>
        <span
          className="animate-bounce-in"
          style={{ animationDelay: '0.2s' }}>
          ✨
        </span>
      </div>

      {/* 标题 */}
      <h1 className="text-3xl sm:text-4xl font-extrabold mb-4 title-fun">{title}</h1>

      {/* 描述 */}
      {description && (
        <p className="text-lg sm:text-xl text-foreground/80 mb-8 max-w-md leading-relaxed">{description}</p>
      )}

      {/* 开始按钮 */}
      <button
        onClick={onStart}
        className="btn btn-primary text-xl px-10 py-4">
        <span className="mr-2">🚀</span>
        开始冒险！
      </button>
    </div>
  );
}
