'use client';

import { useState, useRef, useCallback, useEffect, KeyboardEvent, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { MentionInputProps, MentionPosition } from './types';
import CharacterDropdown from './CharacterDropdown';

/**
 * @ 提及输入组件
 * 支持在文本中使用 @角色ID 引用角色
 * 类似聊天软件的 @ 提及体验
 */
export default function MentionInput({
  value,
  onChange,
  characters,
  placeholder,
  className = '',
  disabled = false,
}: MentionInputProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [mentionPosition, setMentionPosition] = useState<MentionPosition | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 将角色对象转换为数组
  const characterList = useMemo(
    () => Object.entries(characters || {}).map(([id, character]) => ({ id, character })),
    [characters],
  );

  // 过滤后的角色列表
  const filteredCharacters = useMemo(
    () =>
      characterList.filter(
        ({ id, character }) =>
          id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          character.name.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [characterList, searchTerm],
  );

  // 计算下拉框位置
  const updateDropdownPosition = useCallback(() => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const rect = textarea.getBoundingClientRect();

    // 简化处理：在 textarea 下方显示
    setDropdownPosition({
      top: rect.bottom + 4,
      left: rect.left,
    });
  }, []);

  // 处理输入变化
  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    onChange(newValue);

    // 检查是否刚输入了 @
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      // 检查 @ 前面是否是空格、换行或开头
      const charBefore = lastAtIndex > 0 ? newValue[lastAtIndex - 1] : ' ';
      if (charBefore === ' ' || charBefore === '\n' || lastAtIndex === 0) {
        // 获取 @ 后面的搜索词
        const search = textBeforeCursor.slice(lastAtIndex + 1);
        // 如果搜索词不包含空格，则显示下拉框
        if (!search.includes(' ')) {
          setSearchTerm(search);
          setMentionPosition({ start: lastAtIndex, end: cursorPos });
          setSelectedIndex(0);
          setShowDropdown(true);
          updateDropdownPosition();
          return;
        }
      }
    }

    setShowDropdown(false);
    setMentionPosition(null);
  }

  // 处理键盘事件
  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (!showDropdown) return;

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
        if (filteredCharacters.length > 0) {
          e.preventDefault();
          handleSelectCharacter(filteredCharacters[selectedIndex].id);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowDropdown(false);
        break;
    }
  }

  // 选择角色
  function handleSelectCharacter(characterId: string) {
    if (!mentionPosition || !textareaRef.current) return;

    const textarea = textareaRef.current;
    const before = value.slice(0, mentionPosition.start);
    const after = value.slice(mentionPosition.end);

    // 插入 @角色ID
    const newValue = `${before}@${characterId} ${after}`;
    onChange(newValue);

    // 关闭下拉框
    setShowDropdown(false);
    setMentionPosition(null);

    // 移动光标到插入位置之后
    const newCursorPos = mentionPosition.start + characterId.length + 2; // +2 for @ and space
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }

  // 关闭下拉框
  const handleCloseDropdown = useCallback(() => {
    setShowDropdown(false);
    setMentionPosition(null);
  }, []);

  // 渲染带高亮的预览（在 textarea 之上叠加显示）
  const renderHighlightedPreview = useCallback(() => {
    if (!value) return null;

    // 将 @角色ID 替换为高亮显示
    const parts: Array<{ type: 'text' | 'mention'; content: string; characterName?: string }> = [];
    let lastIndex = 0;

    // 匹配 @角色ID
    const regex = /@(\w+)/g;
    let match;

    while ((match = regex.exec(value)) !== null) {
      // 添加前面的文本
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: value.slice(lastIndex, match.index) });
      }

      // 检查是否是有效的角色
      const charId = match[1];
      const character = characters?.[charId];

      if (character) {
        parts.push({ type: 'mention', content: `@${charId}`, characterName: character.name });
      } else {
        parts.push({ type: 'text', content: match[0] });
      }

      lastIndex = match.index + match[0].length;
    }

    // 添加剩余文本
    if (lastIndex < value.length) {
      parts.push({ type: 'text', content: value.slice(lastIndex) });
    }

    return (
      <div className="absolute inset-0 p-2 pointer-events-none whitespace-pre-wrap break-words text-transparent">
        {parts.map((part, index) =>
          part.type === 'mention' ? (
            <span
              key={index}
              className="bg-purple-100 text-purple-100 rounded px-0.5"
            >
              {part.content}
            </span>
          ) : (
            <span key={index}>{part.content}</span>
          ),
        )}
      </div>
    );
  }, [value, characters]);

  // 监听窗口大小变化更新下拉框位置
  useEffect(() => {
    if (showDropdown) {
      window.addEventListener('resize', updateDropdownPosition);
      window.addEventListener('scroll', updateDropdownPosition, true);
      return () => {
        window.removeEventListener('resize', updateDropdownPosition);
        window.removeEventListener('scroll', updateDropdownPosition, true);
      };
    }
  }, [showDropdown, updateDropdownPosition]);

  return (
    <div className={`relative ${className}`}>
      {/* 高亮预览层 */}
      {renderHighlightedPreview()}

      {/* 实际的 textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full p-2 text-sm border border-gray-300 rounded resize-none bg-transparent relative z-10 focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
        style={{ caretColor: 'black' }}
        rows={3}
      />

      {/* 下拉框 */}
      {showDropdown &&
        typeof document !== 'undefined' &&
        createPortal(
          <CharacterDropdown
            characters={characterList}
            onSelect={handleSelectCharacter}
            onClose={handleCloseDropdown}
            searchTerm={searchTerm}
            selectedIndex={selectedIndex}
            position={dropdownPosition}
          />,
          document.body,
        )}
    </div>
  );
}

export { default as CharacterTag } from './CharacterTag';
export { default as CharacterDropdown } from './CharacterDropdown';
export type { MentionInputProps } from './types';
