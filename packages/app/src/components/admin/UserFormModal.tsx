'use client';

import { UserAiPermissionsFields } from '@/components/admin/UserAiPermissionsFields';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AiPermissions } from '@/lib/ai-permissions';
import type { ModalType, UserItem } from '@/hooks/useUsersAdmin';

/** 创建/编辑/改密三个 mutation 输入输出类型各不相同，这里只需要它们共有的状态字段 */
interface ActiveMutationLike {
  isPending: boolean;
  isError: boolean;
  error: Error | null;
}

interface UserFormModalProps {
  modalType: ModalType;
  editingUser: UserItem | null;
  formName: string;
  setFormName: (value: string) => void;
  formEmail: string;
  setFormEmail: (value: string) => void;
  formPassword: string;
  setFormPassword: (value: string) => void;
  formPasswordConfirm: string;
  setFormPasswordConfirm: (value: string) => void;
  formAiPermissions: AiPermissions | null;
  setFormAiPermissions: (value: AiPermissions | null) => void;
  formIsAdmin: boolean;
  setFormIsAdmin: (value: boolean) => void;
  /** 当前登录者是 root：只有 root 能授予/取消管理员 */
  canGrantAdmin: boolean;
  /** 被编辑的用户就是当前登录者：不能取消自己的管理员权限 */
  isSelf: boolean;
  /** 该用户当前套餐名，用于权限区块的默认提示 */
  planLabel: string;
  activeMutation: ActiveMutationLike;
  onClose: () => void;
  onCreateSubmit: (e: React.FormEvent) => void;
  onEditSubmit: (e: React.FormEvent) => void;
  onPasswordSubmit: (e: React.FormEvent) => void;
}

function TextField({
  label,
  type,
  value,
  onChange,
  minLength,
  required = true,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  minLength?: number;
  required?: boolean;
}) {
  const id = label;
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        minLength={minLength}
        required={required}
      />
    </div>
  );
}

function ModalActions({
  pending,
  pendingText,
  submitText,
  onClose,
}: {
  pending: boolean;
  pendingText: string;
  submitText: string;
  onClose: () => void;
}) {
  return (
    <DialogFooter className="pt-2">
      <Button
        type="button"
        variant="outline"
        onClick={onClose}>
        取消
      </Button>
      <Button
        type="submit"
        disabled={pending}>
        {pending ? pendingText : submitText}
      </Button>
    </DialogFooter>
  );
}

/**
 * 创建 / 编辑 / 修改密码三种表单共用的弹窗
 */
export default function UserFormModal({
  modalType,
  editingUser,
  formName,
  setFormName,
  formEmail,
  setFormEmail,
  formPassword,
  setFormPassword,
  formPasswordConfirm,
  setFormPasswordConfirm,
  formAiPermissions,
  setFormAiPermissions,
  formIsAdmin,
  setFormIsAdmin,
  canGrantAdmin,
  isSelf,
  planLabel,
  activeMutation,
  onClose,
  onCreateSubmit,
  onEditSubmit,
  onPasswordSubmit,
}: UserFormModalProps) {
  return (
    <Dialog
      open={modalType !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {modalType === 'create' && '创建用户'}
            {modalType === 'edit' && '编辑用户'}
            {modalType === 'password' && '修改密码'}
          </DialogTitle>
        </DialogHeader>

        {/* Create Form */}
        {modalType === 'create' && (
          <form
            onSubmit={onCreateSubmit}
            className="space-y-4">
            <TextField
              label="名称"
              type="text"
              value={formName}
              onChange={setFormName}
            />
            <TextField
              label="邮箱"
              type="email"
              value={formEmail}
              onChange={setFormEmail}
            />
            <TextField
              label="密码"
              type="password"
              value={formPassword}
              onChange={setFormPassword}
              minLength={6}
            />
            <TextField
              label="确认密码"
              type="password"
              value={formPasswordConfirm}
              onChange={setFormPasswordConfirm}
              minLength={6}
            />
            <ModalActions
              pending={activeMutation.isPending}
              pendingText="创建中..."
              submitText="创建"
              onClose={onClose}
            />
          </form>
        )}

        {/* Edit Form */}
        {modalType === 'edit' && (
          <form
            onSubmit={onEditSubmit}
            className="space-y-4">
            <TextField
              label="名称"
              type="text"
              value={formName}
              onChange={setFormName}
            />
            <TextField
              label="邮箱"
              type="email"
              value={formEmail}
              onChange={setFormEmail}
            />
            {canGrantAdmin && (
              <div className="border-t pt-4">
                <label className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={formIsAdmin}
                    disabled={isSelf}
                    onCheckedChange={(checked) => setFormIsAdmin(checked === true)}
                    className="mt-0.5"
                  />
                  <span>
                    内容管理员
                    <span className="block text-muted-foreground text-xs">
                      可进后台看统计、管理游戏，且不受 Token 限制；不能管理用户与系统配置。
                      {isSelf && '（不能取消自己的管理员权限）'}
                    </span>
                  </span>
                </label>
              </div>
            )}

            <UserAiPermissionsFields
              value={formAiPermissions}
              onChange={setFormAiPermissions}
              planLabel={planLabel}
            />
            <ModalActions
              pending={activeMutation.isPending}
              pendingText="保存中..."
              submitText="保存"
              onClose={onClose}
            />
          </form>
        )}

        {/* Password Form */}
        {modalType === 'password' && (
          <form
            onSubmit={onPasswordSubmit}
            className="space-y-4">
            <p className="text-muted-foreground text-sm">正在为用户「{editingUser?.name}」修改密码</p>
            <TextField
              label="新密码"
              type="password"
              value={formPassword}
              onChange={setFormPassword}
              minLength={6}
            />
            <TextField
              label="确认新密码"
              type="password"
              value={formPasswordConfirm}
              onChange={setFormPasswordConfirm}
              minLength={6}
            />
            <ModalActions
              pending={activeMutation.isPending}
              pendingText="修改中..."
              submitText="修改密码"
              onClose={onClose}
            />
          </form>
        )}

        {/* Error display */}
        {activeMutation.isError && <p className="text-destructive text-sm">{activeMutation.error?.message}</p>}
      </DialogContent>
    </Dialog>
  );
}
