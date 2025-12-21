'use client';

interface GameEndScreenProps {
  onRestart: () => void;
}

/**
 * 游戏结束画面
 */
export default function GameEndScreen({ onRestart }: GameEndScreenProps) {
  return (
    <div className="card p-8 text-center mt-8 animate-bounce-in">
      <div className="text-5xl mb-4">🎉</div>
      <h2 className="text-2xl sm:text-3xl font-bold mb-4 title-fun">故事结束啦！</h2>
      <p className="text-lg text-foreground/70 mb-6">谢谢你的阅读！想再看一遍吗？</p>
      <button
        onClick={onRestart}
        className="btn btn-primary">
        <span className="mr-2">🔄</span>
        再看一遍！
      </button>
    </div>
  );
}
