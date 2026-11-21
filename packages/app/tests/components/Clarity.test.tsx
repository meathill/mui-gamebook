import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import Clarity from '@/components/Clarity';

describe('Clarity', () => {
  const originalId = process.env.NEXT_PUBLIC_CLARITY_ID;

  afterEach(() => {
    if (originalId === undefined) {
      delete process.env.NEXT_PUBLIC_CLARITY_ID;
    } else {
      process.env.NEXT_PUBLIC_CLARITY_ID = originalId;
    }
    cleanup();
    // next/script afterInteractive 会把 script 注入 document.body，手动清掉避免跨用例污染
    document.getElementById('microsoft-clarity')?.remove();
  });

  it('配置了 id 时注入官方 snippet', () => {
    process.env.NEXT_PUBLIC_CLARITY_ID = 'test-clarity-id';
    render(<Clarity />);

    const script = document.querySelector('#microsoft-clarity');
    expect(script).not.toBeNull();
    expect(script?.innerHTML).toContain('https://www.clarity.ms/tag/');
    expect(script?.innerHTML).toContain('test-clarity-id');
  });

  it('未配置 id 时不渲染任何内容', () => {
    delete process.env.NEXT_PUBLIC_CLARITY_ID;
    render(<Clarity />);

    expect(document.querySelector('#microsoft-clarity')).toBeNull();
  });
});
