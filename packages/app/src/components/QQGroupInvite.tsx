export const QQ_GROUP_NAME = '姆伊游戏书交流群';
export const QQ_GROUP_NUMBER = '931810108';
export const QQ_GROUP_QR_SRC = '/images/qq-group-qr.webp';

/** QQ 交流群邀请卡片（仅中文场景使用）。二维码原图 320×399，按宽度等比缩放，写死宽高避免 CLS */
export const QQ_GROUP_DEFAULT_LINE = '爱玩游戏书、想写互动小说？扫码进群，和玩家、作者一起聊剧情、交流创作。';

interface QQGroupInviteProps {
  size?: 'sm' | 'md';
  className?: string;
  /** 自定义标题，默认群名 */
  title?: string;
  /** 自定义邀请语 */
  line?: string;
}

export default function QQGroupInvite({
  size = 'md',
  className = '',
  title = QQ_GROUP_NAME,
  line = QQ_GROUP_DEFAULT_LINE,
}: QQGroupInviteProps) {
  const width = size === 'sm' ? 96 : 128;
  const height = Math.round((width * 399) / 320);
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <img
        src={QQ_GROUP_QR_SRC}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        alt={`QQ 群「${QQ_GROUP_NAME}」二维码，群号 ${QQ_GROUP_NUMBER}`}
        className="rounded-lg border border-gray-200 bg-white shrink-0"
      />
      <div className="text-sm text-gray-600 space-y-1 text-left">
        <p className="font-semibold text-gray-900">{title}</p>
        <p>
          群号：<span className="font-mono select-all">{QQ_GROUP_NUMBER}</span>
        </p>
        <p className="text-gray-500">{line}</p>
      </div>
    </div>
  );
}
