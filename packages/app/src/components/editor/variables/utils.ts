import type { GameState, VariableMeta, VariableDisplay } from '@roudanio/parser/src/types';
import { isVariableMeta } from '@roudanio/parser/src/utils';

export interface VariableFormData {
  name: string;
  value: string;
  valueType: 'number' | 'string' | 'boolean';
  visible: boolean;
  display: VariableDisplay;
  max: string;
  label: string;
  icon: string;
  hasTrigger: boolean;
  triggerCondition: string;
  triggerScene: string;
}

// 常用游戏图标
export const ICON_OPTIONS = [
  { value: '❤️', label: '心脏' },
  { value: '💀', label: '骷髅' },
  { value: '⭐', label: '星星' },
  { value: '💰', label: '钱袋' },
  { value: '🗡️', label: '剑' },
  { value: '🛡️', label: '盾牌' },
  { value: '🔫', label: '枪' },
  { value: '💣', label: '炸弹' },
  { value: '🌸', label: '樱花' },
  { value: '🔥', label: '火焰' },
  { value: '⚡', label: '闪电' },
  { value: '🔑', label: '钥匙' },
  { value: '💎', label: '钻石' },
  { value: '🏆', label: '奖杯' },
];

export const defaultFormData: VariableFormData = {
  name: '',
  value: '0',
  valueType: 'number',
  visible: false,
  display: 'value',
  max: '',
  label: '',
  icon: '❤️',
  hasTrigger: false,
  triggerCondition: '',
  triggerScene: '',
};

export function parseValue(value: string, type: 'number' | 'string' | 'boolean'): number | string | boolean {
  switch (type) {
    case 'number':
      return Number(value) || 0;
    case 'boolean':
      return value === 'true';
    default:
      return value;
  }
}

export function getValueType(value: unknown): 'number' | 'string' | 'boolean' {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  return 'string';
}

export function variableToFormData(name: string, val: GameState[string]): VariableFormData {
  if (isVariableMeta(val)) {
    return {
      name,
      value: String(val.value),
      valueType: getValueType(val.value),
      visible: val.visible ?? false,
      display: val.display ?? 'value',
      max: val.max ? String(val.max) : '',
      label: val.label ?? '',
      icon: val.icon ?? '❤️',
      hasTrigger: !!val.trigger,
      triggerCondition: val.trigger?.condition ?? '',
      triggerScene: val.trigger?.scene ?? '',
    };
  }
  return {
    ...defaultFormData,
    name,
    value: String(val),
    valueType: getValueType(val),
  };
}

export function formDataToVariable(data: VariableFormData): VariableMeta | number | string | boolean {
  const value = parseValue(data.value, data.valueType);

  // 如果只有简单值，返回简单类型
  if (!data.visible && !data.hasTrigger && !data.label && data.display === 'value') {
    return value;
  }

  // 返回完整元数据
  const meta: VariableMeta = { value };
  if (data.visible) meta.visible = true;
  if (data.display !== 'value') meta.display = data.display;
  if (data.max && data.display === 'progress') meta.max = Number(data.max) || 100;
  if (data.label) meta.label = data.label;
  if (data.display === 'icon' && data.icon) meta.icon = data.icon;
  if (data.hasTrigger && data.triggerCondition && data.triggerScene) {
    meta.trigger = {
      condition: data.triggerCondition,
      scene: data.triggerScene,
    };
  }
  return meta;
}

export function getDisplayValue(val: GameState[string]): string {
  if (isVariableMeta(val)) {
    return String(val.value);
  }
  return String(val);
}

export function isVisible(val: GameState[string]): boolean {
  return isVariableMeta(val) && val.visible === true;
}
