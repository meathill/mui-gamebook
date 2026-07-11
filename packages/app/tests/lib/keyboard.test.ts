import { describe, expect, it } from 'vitest';
import { isImeComposing } from '@/lib/keyboard';

describe('isImeComposing', () => {
  it.each([
    { label: '原生 isComposing', event: { isComposing: true } },
    { label: 'Safari 原生 keyCode 229', event: { keyCode: 229 } },
    { label: 'React nativeEvent.isComposing', event: { nativeEvent: { isComposing: true } } },
    { label: 'React Safari nativeEvent.keyCode 229', event: { nativeEvent: { keyCode: 229 } } },
  ])('识别 $label', ({ event }) => {
    expect(isImeComposing(event)).toBe(true);
  });

  it('普通键盘事件返回 false', () => {
    expect(isImeComposing({ isComposing: false, keyCode: 13 })).toBe(false);
  });
});
