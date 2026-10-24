'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircleIcon, InfoIcon, WarningCircleIcon, WarningIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type DialogType = 'alert' | 'confirm' | 'success' | 'error';

interface DialogConfig {
  type: DialogType;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

interface DialogContextType {
  alert: (message: string, title?: string) => Promise<void>;
  confirm: (
    message: string,
    title?: string,
    labels?: { confirmText?: string; cancelText?: string },
  ) => Promise<boolean>;
  success: (message: string, title?: string) => Promise<void>;
  error: (message: string, title?: string) => Promise<void>;
}

const DialogContext = createContext<DialogContextType | null>(null);

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within DialogProvider');
  }
  return context;
}

function TypeIcon({ type }: { type: DialogType }) {
  switch (type) {
    case 'success':
      return <CheckCircleIcon className="size-5 shrink-0 text-green-600" />;
    case 'error':
      return <WarningCircleIcon className="size-5 shrink-0 text-red-600" />;
    case 'confirm':
      return <WarningIcon className="size-5 shrink-0 text-amber-500" />;
    default:
      return <InfoIcon className="size-5 shrink-0 text-blue-500" />;
  }
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogConfig | null>(null);
  const [resolveRef, setResolveRef] = useState<((value: boolean) => void) | null>(null);

  const showDialog = useCallback((config: DialogConfig): Promise<boolean> => {
    return new Promise((resolve) => {
      setResolveRef(() => resolve);
      setDialog(config);
    });
  }, []);

  const closeDialog = useCallback(
    (result: boolean) => {
      if (resolveRef) {
        resolveRef(result);
      }
      setDialog(null);
      setResolveRef(null);
    },
    [resolveRef],
  );

  const alert = useCallback(
    async (message: string, title?: string) => {
      await showDialog({
        type: 'alert',
        title: title || '提示',
        message,
        confirmText: '确定',
      });
    },
    [showDialog],
  );

  const confirm = useCallback(
    async (message: string, title?: string, labels?: { confirmText?: string; cancelText?: string }) => {
      return showDialog({
        type: 'confirm',
        title: title || '确认',
        message,
        confirmText: labels?.confirmText ?? '确定',
        cancelText: labels?.cancelText ?? '取消',
      });
    },
    [showDialog],
  );

  const success = useCallback(
    async (message: string, title?: string) => {
      await showDialog({
        type: 'success',
        title: title || '成功',
        message,
        confirmText: '确定',
      });
    },
    [showDialog],
  );

  const error = useCallback(
    async (message: string, title?: string) => {
      await showDialog({
        type: 'error',
        title: title || '错误',
        message,
        confirmText: '确定',
      });
    },
    [showDialog],
  );

  return (
    <DialogContext.Provider value={{ alert, confirm, success, error }}>
      {children}

      <Dialog
        open={!!dialog}
        onOpenChange={(open) => !open && closeDialog(dialog?.type === 'confirm' ? false : true)}>
        {dialog && (
          <DialogContent
            className="max-w-md"
            showCloseButton={dialog.type !== 'confirm'}
            onEscapeKeyDown={(e) => {
              if (dialog.type === 'confirm') {
                e.preventDefault();
              }
            }}
            onPointerDownOutside={(e) => {
              if (dialog.type === 'confirm') {
                e.preventDefault();
              }
            }}>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <TypeIcon type={dialog.type} />
                <DialogTitle>{dialog.title}</DialogTitle>
              </div>
              <DialogDescription className="whitespace-pre-wrap leading-relaxed">{dialog.message}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              {dialog.type === 'confirm' && (
                <Button
                  variant="secondary"
                  onClick={() => closeDialog(false)}>
                  {dialog.cancelText}
                </Button>
              )}
              <Button
                variant={dialog.type === 'error' ? 'destructive' : 'default'}
                onClick={() => closeDialog(true)}>
                {dialog.confirmText}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </DialogContext.Provider>
  );
}
