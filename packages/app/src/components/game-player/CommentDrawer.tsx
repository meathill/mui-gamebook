'use client';

import { XIcon } from '@phosphor-icons/react';
import Comment from '@/components/Comment';

interface CommentDrawerProps {
  postId: string;
  onClose: () => void;
}

/** 沉浸式播放器的右侧评论抽屉 */
export default function CommentDrawer({ postId, onClose }: CommentDrawerProps) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60"
      onClick={onClose}>
      <div
        className="absolute top-0 right-0 bottom-0 w-full sm:w-[480px] bg-white text-gray-900 shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b px-5 py-3 flex items-center justify-between">
          <h3 className="font-semibold">评论</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
            aria-label="关闭">
            <XIcon size={18} />
          </button>
        </div>
        <div className="p-5">
          <Comment postId={postId} />
        </div>
      </div>
    </div>
  );
}
