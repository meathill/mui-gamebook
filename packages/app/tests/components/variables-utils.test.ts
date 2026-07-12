import { describe, expect, it } from 'vitest';
import {
  defaultFormData,
  formDataToVariable,
  getDisplayValue,
  getValueType,
  isVisible,
  parseValue,
  variableToFormData,
} from '@/components/editor/variables/utils';

describe('parseValue', () => {
  it('number 类型解析为数字，非法输入回退为 0', () => {
    expect(parseValue('42', 'number')).toBe(42);
    expect(parseValue('abc', 'number')).toBe(0);
  });

  it('boolean 类型只有字符串 "true" 才解析为 true', () => {
    expect(parseValue('true', 'boolean')).toBe(true);
    expect(parseValue('false', 'boolean')).toBe(false);
    expect(parseValue('anything else', 'boolean')).toBe(false);
  });

  it('string 类型原样返回', () => {
    expect(parseValue('hello', 'string')).toBe('hello');
  });
});

describe('getValueType', () => {
  it('按 JS 运行时类型推断', () => {
    expect(getValueType(true)).toBe('boolean');
    expect(getValueType(42)).toBe('number');
    expect(getValueType('x')).toBe('string');
  });
});

describe('variableToFormData', () => {
  it('简单值：回填默认表单并推断类型', () => {
    expect(variableToFormData('gold', 100)).toEqual({
      ...defaultFormData,
      name: 'gold',
      value: '100',
      valueType: 'number',
    });
  });

  it('带元数据的变量：回填所有字段', () => {
    const result = variableToFormData('hp', {
      value: 80,
      visible: true,
      display: 'progress',
      max: 100,
      label: '生命值',
      icon: '❤️',
      trigger: { condition: '<= 0', scene: 'game_over' },
    });

    expect(result).toEqual({
      name: 'hp',
      value: '80',
      valueType: 'number',
      visible: true,
      display: 'progress',
      max: '100',
      label: '生命值',
      icon: '❤️',
      hasTrigger: true,
      triggerCondition: '<= 0',
      triggerScene: 'game_over',
    });
  });
});

describe('formDataToVariable', () => {
  it('没有任何元数据字段时退化为简单值', () => {
    expect(formDataToVariable({ ...defaultFormData, name: 'gold', value: '100' })).toBe(100);
  });

  it('设置了 visible 时返回带元数据的对象', () => {
    expect(formDataToVariable({ ...defaultFormData, name: 'gold', value: '100', visible: true })).toEqual({
      value: 100,
      visible: true,
    });
  });

  it('display 为 progress 且填了 max 时带上 max 字段，非法 max 回退为 100', () => {
    expect(
      formDataToVariable({ ...defaultFormData, name: 'hp', value: '80', display: 'progress', max: '200' }),
    ).toEqual({ value: 80, display: 'progress', max: 200 });

    expect(
      formDataToVariable({ ...defaultFormData, name: 'hp', value: '80', display: 'progress', max: 'not-a-number' }),
    ).toEqual({ value: 80, display: 'progress', max: 100 });
  });

  it('display 为 icon 时带上 icon 字段', () => {
    expect(formDataToVariable({ ...defaultFormData, name: 'hp', value: '80', display: 'icon', icon: '💎' })).toEqual({
      value: 80,
      display: 'icon',
      icon: '💎',
    });
  });

  it('hasTrigger 但缺少 condition 或 scene 时不写入 trigger 字段', () => {
    expect(
      formDataToVariable({
        ...defaultFormData,
        name: 'hp',
        value: '80',
        label: '生命',
        hasTrigger: true,
        triggerCondition: '<= 0',
      }),
    ).toEqual({ value: 80, label: '生命' });
  });

  it('hasTrigger 且 condition/scene 都填写时写入 trigger', () => {
    expect(
      formDataToVariable({
        ...defaultFormData,
        name: 'hp',
        value: '80',
        label: '生命',
        hasTrigger: true,
        triggerCondition: '<= 0',
        triggerScene: 'game_over',
      }),
    ).toEqual({ value: 80, label: '生命', trigger: { condition: '<= 0', scene: 'game_over' } });
  });
});

describe('getDisplayValue / isVisible', () => {
  it('简单值：getDisplayValue 直接转字符串，isVisible 恒为 false', () => {
    expect(getDisplayValue(100)).toBe('100');
    expect(isVisible(100)).toBe(false);
  });

  it('带元数据变量：getDisplayValue 取 value 字段，isVisible 看 visible 字段', () => {
    expect(getDisplayValue({ value: 80, visible: true })).toBe('80');
    expect(isVisible({ value: 80, visible: true })).toBe(true);
    expect(isVisible({ value: 80, visible: false })).toBe(false);
  });
});
