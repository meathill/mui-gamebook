'use client';

import { useState } from 'react';
import { CaretLeftIcon } from '@phosphor-icons/react';
import {
  VariableForm,
  VariableList,
  VariableFormData,
  defaultFormData,
  variableToFormData,
  formDataToVariable,
} from '@/components/editor/variables';
import { useDialog } from '@/components/Dialog';
import type { GameState } from '@mui-gamebook/parser/src/types';
import SidebarSearchBar from './SidebarSearchBar';

interface SidebarVariablesProps {
  state: GameState;
  scenes: Record<string, { id: string }>;
  onChange: (newState: GameState) => void;
}

/**
 * 变量面板
 */
export default function SidebarVariables({ state, scenes, onChange }: SidebarVariablesProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVar, setSelectedVar] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<VariableFormData>(defaultFormData);
  const dialog = useDialog();

  const variables = Object.entries(state);
  const sceneList = Object.keys(scenes);

  const filteredVariables = searchQuery
    ? variables.filter(([name]) => name.toLowerCase().includes(searchQuery.toLowerCase()))
    : variables;

  function handleSelectVariable(name: string) {
    if (selectedVar === name) {
      setSelectedVar(null);
      return;
    }
    setSelectedVar(name);
    setIsCreating(false);
    setFormData(variableToFormData(name, state[name]));
  }

  function handleCreateNew() {
    setSelectedVar(null);
    setIsCreating(true);
    const newName = `var_${Date.now().toString().slice(-4)}`;
    setFormData({ ...defaultFormData, name: newName });
  }

  async function handleSaveVariable() {
    if (!formData.name.trim()) {
      await dialog.alert('变量名不能为空');
      return;
    }
    const newState = { ...state };
    if (selectedVar && formData.name !== selectedVar) {
      if (state[formData.name] !== undefined) {
        await dialog.alert('变量名已存在');
        return;
      }
      delete newState[selectedVar];
    }
    if (isCreating && state[formData.name] !== undefined) {
      await dialog.alert('变量名已存在');
      return;
    }
    newState[formData.name] = formDataToVariable(formData);
    onChange(newState);
    setSelectedVar(formData.name);
    setIsCreating(false);
  }

  async function handleDeleteVariable(name: string) {
    const confirmed = await dialog.confirm(`确定删除变量 "${name}" 吗？`);
    if (!confirmed) return;
    const newState = { ...state };
    delete newState[name];
    onChange(newState);
    if (selectedVar === name) {
      setSelectedVar(null);
      setFormData(defaultFormData);
    }
  }

  async function updateFormData(updates: Partial<VariableFormData>) {
    const newFormData = { ...formData, ...updates };
    setFormData(newFormData);
    if (selectedVar && !isCreating) {
      const newState = { ...state };
      if (updates.name && updates.name !== selectedVar) {
        if (state[updates.name] !== undefined) {
          await dialog.alert('变量名已存在');
          return;
        }
        delete newState[selectedVar];
        setSelectedVar(updates.name);
      }
      newState[newFormData.name] = formDataToVariable(newFormData);
      onChange(newState);
    }
  }

  if (selectedVar || isCreating) {
    return (
      <div className="flex flex-col">
        <button
          onClick={() => {
            setSelectedVar(null);
            setIsCreating(false);
          }}
          className="flex items-center gap-1 px-3 py-2 text-xs text-gray-500 hover:text-gray-700 border-b border-gray-100">
          <CaretLeftIcon size={14} />
          返回列表
        </button>
        <VariableForm
          formData={formData}
          isCreating={isCreating}
          sceneList={sceneList}
          onUpdate={updateFormData}
          onSave={handleSaveVariable}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <SidebarSearchBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onCreateNew={handleCreateNew}
      />
      <VariableList
        variables={filteredVariables}
        selectedVar={selectedVar}
        onSelect={handleSelectVariable}
        onDelete={handleDeleteVariable}
        searchQuery={searchQuery}
      />
    </div>
  );
}
