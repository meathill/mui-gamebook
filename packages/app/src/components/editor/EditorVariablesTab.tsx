import { useState, useMemo } from 'react';
import { Plus, Trash2, Eye, EyeOff, Search } from 'lucide-react';
import type { GameState, VariableMeta, VariableDisplay } from '@mui-gamebook/parser/src/types';
import { isVariableMeta } from '@mui-gamebook/parser/src/types';

interface Props {
  state: GameState;
  onChange: (newState: GameState) => void;
  scenes: Map<string, { id: string }>;
}

interface VariableFormData {
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
const ICON_OPTIONS = [
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

const defaultFormData: VariableFormData = {
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

function parseValue(value: string, type: 'number' | 'string' | 'boolean'): number | string | boolean {
  switch (type) {
    case 'number':
      return Number(value) || 0;
    case 'boolean':
      return value === 'true';
    default:
      return value;
  }
}

function getValueType(value: unknown): 'number' | 'string' | 'boolean' {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  return 'string';
}

function variableToFormData(name: string, val: GameState[string]): VariableFormData {
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

function formDataToVariable(data: VariableFormData): VariableMeta | number | string | boolean {
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

export default function EditorVariablesTab({ state, onChange, scenes }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVar, setSelectedVar] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<VariableFormData>(defaultFormData);

  const variables = Object.entries(state);
  const sceneList = Array.from(scenes.keys());

  // 过滤变量列表
  const filteredVariables = useMemo(() => {
    if (!searchQuery) return variables;
    const query = searchQuery.toLowerCase();
    return variables.filter(([name]) => name.toLowerCase().includes(query));
  }, [variables, searchQuery]);

  const handleSelectVariable = (name: string) => {
    setSelectedVar(name);
    setIsCreating(false);
    setFormData(variableToFormData(name, state[name]));
  };

  const handleCreateNew = () => {
    setSelectedVar(null);
    setIsCreating(true);
    const newName = `var_${Date.now().toString().slice(-4)}`;
    setFormData({ ...defaultFormData, name: newName });
  };

  const handleSaveVariable = () => {
    if (!formData.name.trim()) {
      alert('变量名不能为空');
      return;
    }

    const newState = { ...state };
    
    // 如果是编辑现有变量且变量名改变
    if (selectedVar && formData.name !== selectedVar) {
      if (state[formData.name] !== undefined) {
        alert('变量名已存在');
        return;
      }
      delete newState[selectedVar];
    }
    
    // 如果是新建变量
    if (isCreating && state[formData.name] !== undefined) {
      alert('变量名已存在');
      return;
    }
    
    newState[formData.name] = formDataToVariable(formData);
    onChange(newState);
    
    // 更新选中状态
    setSelectedVar(formData.name);
    setIsCreating(false);
  };

  const handleDeleteVariable = (name: string) => {
    if (!confirm(`确定删除变量 "${name}" 吗？`)) return;
    const newState = { ...state };
    delete newState[name];
    onChange(newState);
    
    if (selectedVar === name) {
      setSelectedVar(null);
      setFormData(defaultFormData);
    }
  };

  const getDisplayValue = (val: GameState[string]): string => {
    if (isVariableMeta(val)) {
      return String(val.value);
    }
    return String(val);
  };

  const isVisible = (val: GameState[string]): boolean => {
    return isVariableMeta(val) && val.visible === true;
  };

  const updateFormData = (updates: Partial<VariableFormData>) => {
    const newFormData = { ...formData, ...updates };
    setFormData(newFormData);
    
    // 如果正在编辑现有变量，自动保存
    if (selectedVar && !isCreating) {
      const newState = { ...state };
      if (updates.name && updates.name !== selectedVar) {
        if (state[updates.name] !== undefined) {
          alert('变量名已存在');
          return;
        }
        delete newState[selectedVar];
        setSelectedVar(updates.name);
      }
      newState[newFormData.name] = formDataToVariable(newFormData);
      onChange(newState);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-6 h-[calc(100vh-200px)] flex">
      {/* 左侧列表 */}
      <div className="w-64 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-3">变量管理</h2>
          
          {/* 搜索和新建 */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜索..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleCreateNew}
              className="p-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              title="新建变量"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* 变量列表 */}
        <div className="flex-1 overflow-y-auto">
          {filteredVariables.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-sm">
              {searchQuery ? '无匹配变量' : '暂无变量'}
            </div>
          ) : (
            <div className="py-1">
              {filteredVariables.map(([name, val]) => (
                <div
                  key={name}
                  className={`px-4 py-2 cursor-pointer flex items-center gap-2 hover:bg-gray-50 ${
                    selectedVar === name ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                  }`}
                  onClick={() => handleSelectVariable(name)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm text-gray-900 truncate">{name}</div>
                    <div className="text-xs text-gray-500 truncate">= {getDisplayValue(val)}</div>
                  </div>
                  {isVisible(val) && (
                    <Eye size={12} className="text-green-600 flex-shrink-0" />
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); handleDeleteVariable(name); }}
                    className="p-1 text-gray-400 hover:text-red-600 rounded flex-shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 右侧编辑区域 */}
      <div className="flex-1 overflow-y-auto">
        {(selectedVar || isCreating) ? (
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                {isCreating ? '新建变量' : '编辑变量'}
              </h3>
              {isCreating && (
                <button
                  onClick={handleSaveVariable}
                  className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                >
                  创建
                </button>
              )}
            </div>

            {/* 变量名和显示名称 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">变量名</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => updateFormData({ name: e.target.value.replace(/\s/g, '_') })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">显示名称</label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={e => updateFormData({ label: e.target.value })}
                  placeholder="可选，用于界面显示"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>

            {/* 类型和初始值 */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                <select
                  value={formData.valueType}
                  onChange={e => {
                    const newType = e.target.value as 'number' | 'string' | 'boolean';
                    let newValue = formData.value;
                    if (newType === 'boolean') newValue = 'false';
                    else if (newType === 'number') newValue = '0';
                    updateFormData({ valueType: newType, value: newValue });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="number">数字</option>
                  <option value="string">文本</option>
                  <option value="boolean">布尔值</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">初始值</label>
                {formData.valueType === 'boolean' ? (
                  <select
                    value={formData.value}
                    onChange={e => updateFormData({ value: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                ) : (
                  <input
                    type={formData.valueType === 'number' ? 'number' : 'text'}
                    value={formData.value}
                    onChange={e => updateFormData({ value: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                )}
              </div>
            </div>

            {/* 可见性 */}
            <div className="pt-4 border-t">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.visible}
                  onChange={e => updateFormData({ visible: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">在游戏中显示</span>
                {formData.visible ? <Eye size={14} className="text-green-600" /> : <EyeOff size={14} className="text-gray-400" />}
              </label>

              {formData.visible && (
                <div className="mt-4 pl-6 border-l-2 border-blue-200 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">展示方式</label>
                      <select
                        value={formData.display}
                        onChange={e => updateFormData({ display: e.target.value as VariableDisplay })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="value">数值</option>
                        <option value="progress">进度条</option>
                        <option value="icon">图标</option>
                      </select>
                    </div>
                    {formData.display === 'progress' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">最大值</label>
                        <input
                          type="number"
                          value={formData.max}
                          onChange={e => updateFormData({ max: e.target.value })}
                          placeholder="100"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                    )}
                    {formData.display === 'icon' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">选择图标</label>
                        <select
                          value={formData.icon}
                          onChange={e => updateFormData({ icon: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                          {ICON_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>
                              {opt.value} {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 触发器 */}
            <div className="pt-4 border-t">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.hasTrigger}
                  onChange={e => updateFormData({ hasTrigger: e.target.checked })}
                  className="w-4 h-4 text-orange-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700">条件触发器</span>
                <span className="text-xs text-gray-500">（满足条件时自动跳转场景）</span>
              </label>

              {formData.hasTrigger && (
                <div className="mt-4 pl-6 border-l-2 border-orange-200 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">触发条件</label>
                    <input
                      type="text"
                      value={formData.triggerCondition}
                      onChange={e => updateFormData({ triggerCondition: e.target.value })}
                      placeholder="如: <= 0 或 == true"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      支持: ==, !=, &gt;, &lt;, &gt;=, &lt;=
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">跳转场景</label>
                    <select
                      value={formData.triggerScene}
                      onChange={e => updateFormData({ triggerScene: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">选择场景...</option>
                      {sceneList.map(sceneId => (
                        <option key={sceneId} value={sceneId}>{sceneId}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            <div className="text-center">
              <p className="mb-2">选择左侧变量进行编辑</p>
              <p className="text-sm">或点击 + 按钮新建变量</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
