'use client';

import { useState, useRef, useMemo, KeyboardEvent, useCallback } from 'react';
import type { AICharacter } from '@mui-gamebook/parser/src/types';

interface CharacterMentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  characters?: Record<string, AICharacter>;
  placeholder?: string;
  className?: string;
}

/**
 * 支持 @mention 的文本输入框
 * 功能：
 * 1. 输入 @ 时弹出角色选择器
 * 2. 显示时将 @角色ID 高亮为角色名称
 * 3. 底部显示可用角色提示
 */
export default function CharacterMentionTextarea({
  value,
  onChange,
  characters = {},
  placeholder,
  className,
}: CharacterMentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showPopover, setShowPopover] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // 可用角色列表
  const characterList = useMemo(() => {
    return Object.entries(characters).map(([id, char]) => ({
      id,
      name: char.name,
      imageUrl: char.image_url,
    }));
  }, [characters]);

  // 过滤后的角色列表
  const filteredCharacters = useMemo(() => {
    if (!mentionQuery) return characterList;
    const query = mentionQuery.toLowerCase();
    return characterList.filter(
      (char) => char.id.toLowerCase().includes(query) || char.name.toLowerCase().includes(query),
    );
  }, [characterList, mentionQuery]);

  // 检测 @ 输入
  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    onChange(newValue);

    // 检查光标前是否有未完成的 @mention
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');

    if (atIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(atIndex + 1);
      // 如果 @ 后只有字母数字下划线（或为空），则显示弹窗
      if (/^\w*$/.test(textAfterAt)) {
        setMentionStartIndex(atIndex);
        setMentionQuery(textAfterAt);
        setShowPopover(true);
        setSelectedIndex(0);
        updatePopoverPosition();
        return;
      }
    }

    setShowPopover(false);
    setMentionQuery('');
  }

  // 更新弹窗位置
  function updatePopoverPosition() {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const rect = textarea.getBoundingClientRect();
    // 简化处理：popover 显示在 textarea 下方
    setPopoverPosition({
      x: rect.left,
      y: rect.bottom + 4,
    });
  }

  // 选择角色
  const selectCharacter = useCallback(
    (charId: string) => {
      if (mentionStartIndex === -1 || !textareaRef.current) return;

      const cursorPos = textareaRef.current.selectionStart || 0;
      const before = value.slice(0, mentionStartIndex);
      const after = value.slice(cursorPos);
      const newValue = `${before}@${charId} ${after}`;

      onChange(newValue);
      setShowPopover(false);
      setMentionQuery('');
      setMentionStartIndex(-1);

      // 恢复焦点并设置光标位置
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const newCursorPos = before.length + charId.length + 2; // @id + space
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    },
    [mentionStartIndex, value, onChange],
  );

  // 键盘导航
  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (!showPopover || filteredCharacters.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCharacters.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCharacters.length) % filteredCharacters.length);
        break;
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        selectCharacter(filteredCharacters[selectedIndex].id);
        break;
      case 'Escape':
        e.preventDefault();
        setShowPopover(false);
        break;
    }
  }

  // 生成高亮显示的内容（用于预览）
  const highlightedContent = useMemo(() => {
    if (!value || Object.keys(characters).length === 0) return null;

    const parts: { text: string; isCharacter: boolean; charName?: string }[] = [];
    let lastIndex = 0;

    // 匹配所有 @xxx
    const regex = /@(\w+)/g;
    let match;

    while ((match = regex.exec(value)) !== null) {
      // 添加匹配前的普通文本
      if (match.index > lastIndex) {
        parts.push({ text: value.slice(lastIndex, match.index), isCharacter: false });
      }

      const charId = match[1];
      const char = characters[charId];
      if (char) {
        parts.push({ text: `@${char.name}`, isCharacter: true, charName: char.name });
      } else {
        parts.push({ text: match[0], isCharacter: false });
      }
      lastIndex = match.index + match[0].length;
    }

    // 添加剩余文本
    if (lastIndex < value.length) {
      parts.push({ text: value.slice(lastIndex), isCharacter: false });
    }

    return parts;
  }, [value, characters]);

  return (
    <div className="relative">
      {/* 原始 Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
      />

      {/* 自动完成弹窗 */}
      {showPopover && filteredCharacters.length > 0 && (
        <div
          className="absolute z-50 mt-1 w-64 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg"
          style={{ left: 0, top: '100%' }}>
          {filteredCharacters.map((char, index) => (
            <button
              key={char.id}
              type="button"
              className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-blue-50 ${
                index === selectedIndex ? 'bg-blue-100' : ''
              }`}
              onClick={() => selectCharacter(char.id)}>
              {char.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={char.imageUrl}
                  alt={char.name}
                  className="w-6 h-6 rounded-full object-cover"
                />
              )}
              <span className="font-medium">{char.name}</span>
              <span className="text-gray-400 text-xs">@{char.id}</span>
            </button>
          ))}
        </div>
      )}

      {/* 可用角色提示 */}
      {characterList.length > 0 && (
        <div className="mt-1 text-xs text-gray-400 flex flex-wrap gap-1">
          <span>可用角色：</span>
          {characterList.slice(0, 5).map((char) => (
            <button
              key={char.id}
              type="button"
              className="text-blue-500 hover:text-blue-700 hover:underline"
              onClick={() => {
                // 在当前光标位置插入 @角色ID
                if (textareaRef.current) {
                  const cursorPos = textareaRef.current.selectionStart || value.length;
                  const before = value.slice(0, cursorPos);
                  const after = value.slice(cursorPos);
                  onChange(`${before}@${char.id} ${after}`);
                  // 恢复焦点
                  setTimeout(() => textareaRef.current?.focus(), 0);
                }
              }}>
              @{char.id}
            </button>
          ))}
          {characterList.length > 5 && <span className="text-gray-300">+{characterList.length - 5} 更多</span>}
        </div>
      )}
    </div>
  );
}
