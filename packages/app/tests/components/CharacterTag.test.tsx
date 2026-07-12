import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CharacterTag from '@/components/editor/MentionInput/CharacterTag';

describe('CharacterTag', () => {
  it('渲染带 @ 前缀的角色名，且不可编辑', () => {
    render(
      <CharacterTag
        id="hero"
        name="英雄"
      />,
    );

    const tag = screen.getByText('@英雄');
    expect(tag).toBeInTheDocument();
    expect(tag).toHaveAttribute('contenteditable', 'false');
  });
});
