interface KeyboardEventLike {
  isComposing?: boolean;
  keyCode?: number;
  nativeEvent?: {
    isComposing?: boolean;
    keyCode?: number;
  };
}

/** 判断键盘事件是否仍处于输入法组合阶段，包括 Safari 的 keyCode 229 兼容信号。 */
export function isImeComposing(event: KeyboardEventLike): boolean {
  return Boolean(
    event.isComposing || event.keyCode === 229 || event.nativeEvent?.isComposing || event.nativeEvent?.keyCode === 229,
  );
}
