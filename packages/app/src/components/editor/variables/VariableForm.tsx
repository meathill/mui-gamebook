import { EyeIcon, EyeSlashIcon } from '@phosphor-icons/react/dist/ssr';
import type { VariableDisplay } from '@roudanio/parser/src/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { VariableFormData, ICON_OPTIONS } from './utils';

interface VariableFormProps {
  formData: VariableFormData;
  isCreating: boolean;
  sceneList: string[];
  onUpdate: (updates: Partial<VariableFormData>) => void;
  onSave: () => void;
}

export default function VariableForm({ formData, isCreating, sceneList, onUpdate, onSave }: VariableFormProps) {
  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">{isCreating ? '新建变量' : '编辑变量'}</h3>
        {isCreating && (
          <button
            onClick={onSave}
            className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
            创建
          </button>
        )}
      </div>

      {/* 变量名和显示名称 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">变量名</label>
          <Input
            type="text"
            value={formData.name}
            onChange={(e) => onUpdate({ name: e.target.value.replace(/\s/g, '_') })}
            className="font-mono"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">显示名称</label>
          <Input
            type="text"
            value={formData.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            placeholder="可选，用于界面显示"
          />
        </div>
      </div>

      {/* 类型和初始值 */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
          <NativeSelect
            value={formData.valueType}
            onChange={(e) => {
              const newType = e.target.value as 'number' | 'string' | 'boolean';
              let newValue = formData.value;
              if (newType === 'boolean') newValue = 'false';
              else if (newType === 'number') newValue = '0';
              onUpdate({ valueType: newType, value: newValue });
            }}>
            <option value="number">数字</option>
            <option value="string">文本</option>
            <option value="boolean">布尔值</option>
          </NativeSelect>
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">初始值</label>
          {formData.valueType === 'boolean' ? (
            <NativeSelect
              value={formData.value}
              onChange={(e) => onUpdate({ value: e.target.value })}>
              <option value="true">true</option>
              <option value="false">false</option>
            </NativeSelect>
          ) : (
            <Input
              type={formData.valueType === 'number' ? 'number' : 'text'}
              value={formData.value}
              onChange={(e) => onUpdate({ value: e.target.value })}
            />
          )}
        </div>
      </div>

      {/* 可见性 */}
      <div className="pt-4 border-t">
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={formData.visible}
            onCheckedChange={(checked) => onUpdate({ visible: checked === true })}
          />
          <span className="text-sm text-gray-700">在游戏中显示</span>
          {formData.visible ? (
            <EyeIcon
              size={14}
              className="text-green-600"
            />
          ) : (
            <EyeSlashIcon
              size={14}
              className="text-gray-400"
            />
          )}
        </label>

        {formData.visible && (
          <div className="mt-4 pl-6 border-l-2 border-blue-200 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">展示方式</label>
                <NativeSelect
                  value={formData.display}
                  onChange={(e) => onUpdate({ display: e.target.value as VariableDisplay })}>
                  <option value="value">数值</option>
                  <option value="progress">进度条</option>
                  <option value="icon">图标</option>
                </NativeSelect>
              </div>
              {formData.display === 'progress' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">最大值</label>
                  <Input
                    type="number"
                    value={formData.max}
                    onChange={(e) => onUpdate({ max: e.target.value })}
                    placeholder="100"
                  />
                </div>
              )}
              {formData.display === 'icon' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">选择图标</label>
                  <NativeSelect
                    value={formData.icon}
                    onChange={(e) => onUpdate({ icon: e.target.value })}>
                    {ICON_OPTIONS.map((opt) => (
                      <option
                        key={opt.value}
                        value={opt.value}>
                        {opt.value} {opt.label}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 触发器 */}
      <div className="pt-4 border-t">
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={formData.hasTrigger}
            onCheckedChange={(checked) => onUpdate({ hasTrigger: checked === true })}
          />
          <span className="text-sm font-medium text-gray-700">条件触发器</span>
          <span className="text-xs text-gray-500">（满足条件时自动跳转场景）</span>
        </label>

        {formData.hasTrigger && (
          <div className="mt-4 pl-6 border-l-2 border-orange-200 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">触发条件</label>
              <Input
                type="text"
                value={formData.triggerCondition}
                onChange={(e) => onUpdate({ triggerCondition: e.target.value })}
                placeholder="如: <= 0 或 == true"
                className="font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">支持: ==, !=, &gt;, &lt;, &gt;=, &lt;=</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">跳转场景</label>
              <NativeSelect
                value={formData.triggerScene}
                onChange={(e) => onUpdate({ triggerScene: e.target.value })}>
                <option value="">选择场景...</option>
                {sceneList.map((sceneId) => (
                  <option
                    key={sceneId}
                    value={sceneId}>
                    {sceneId}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
