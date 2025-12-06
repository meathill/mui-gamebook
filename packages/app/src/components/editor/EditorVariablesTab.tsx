import { useState, useMemo } from 'react';
import { Plus, Search } from 'lucide-react';
import type { GameState } from '@mui-gamebook/parser/src/types';
import { useDialog } from '@/components/Dialog';
import {
  VariableForm,
  VariableList,
  VariableFormData,
  defaultFormData,
  variableToFormData,
  formDataToVariable
} from './variables';

interface Props {
  state: GameState;
  onChange: (newState: GameState) => void;
  scenes: Map<string, { id: string }>;
}

export default function EditorVariablesTab({ state, onChange, scenes }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVar, setSelectedVar] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<VariableFormData>(defaultFormData);
  const dialog = useDialog();

  const variables = Object.entries(state);
  const sceneList = Array.from(scenes.keys());

  const filteredVariables = useMemo(() => {
    if (!searchQuery) return variables;
    const query = searchQuery.toLowerCase();
    return variables.filter(([name]) => name.toLowerCase().includes(query));
  }, [variables, searchQuery]);

  const handleSelectVariable = (name: string) => {
    setSelectedVar(name);
    setIsCreating(false);
    setFormData(variableToFormData(name, state[ name ]));
  };

  const handleCreateNew = () => {
    setSelectedVar(null);
    setIsCreating(true);
    const newName = `var_${Date.now().toString().slice(-4)}`;
    setFormData({ ...defaultFormData, name: newName });
  };

  const handleSaveVariable = async () => {
    if (!formData.name.trim()) {
      await dialog.alert('变量名不能为空');
      return;
    }

    const newState = { ...state };

    if (selectedVar && formData.name !== selectedVar) {
      if (state[ formData.name ] !== undefined) {
        await dialog.alert('变量名已存在');
        return;
      }
      delete newState[ selectedVar ];
    }

    if (isCreating && state[ formData.name ] !== undefined) {
      await dialog.alert('变量名已存在');
      return;
    }

    newState[ formData.name ] = formDataToVariable(formData);
    onChange(newState);

    setSelectedVar(formData.name);
    setIsCreating(false);
  };

  const handleDeleteVariable = async (name: string) => {
    const confirmed = await dialog.confirm(`确定删除变量 "${name}" 吗？`);
    if (!confirmed) return;
    const newState = { ...state };
    delete newState[ name ];
    onChange(newState);

    if (selectedVar === name) {
      setSelectedVar(null);
      setFormData(defaultFormData);
    }
  };

  const updateFormData = async (updates: Partial<VariableFormData>) => {
    const newFormData = { ...formData, ...updates };
    setFormData(newFormData);

    if (selectedVar && !isCreating) {
      const newState = { ...state };
      if (updates.name && updates.name !== selectedVar) {
        if (state[ updates.name ] !== undefined) {
          await dialog.alert('变量名已存在');
          return;
        }
        delete newState[ selectedVar ];
        setSelectedVar(updates.name);
      }
      newState[ newFormData.name ] = formDataToVariable(newFormData);
      onChange(newState);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex">
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
          <VariableList
            variables={filteredVariables}
            selectedVar={selectedVar}
            onSelect={handleSelectVariable}
            onDelete={handleDeleteVariable}
            searchQuery={searchQuery}
          />
        </div>
      </div>

      {/* 右侧编辑区域 */}
      <div className="flex-1 overflow-y-auto">
        {(selectedVar || isCreating) ? (
          <VariableForm
            formData={formData}
            isCreating={isCreating}
            sceneList={sceneList}
            onUpdate={updateFormData}
            onSave={handleSaveVariable}
          />
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
