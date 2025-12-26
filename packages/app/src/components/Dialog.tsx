'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@radix-ui/themes';
import { X, AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';

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
  confirm: (message: string, title?: string) => Promise<boolean>;
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
    async (message: string, title?: string) => {
      return showDialog({
        type: 'confirm',
        title: title || '确认',
        message,
        confirmText: '确定',
        cancelText: '取消',
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

  const getIcon = () => {
    switch (dialog?.type) {
      case 'success':
        return <CheckCircle className="w-10 h-10 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-10 h-10 text-red-500" />;
      case 'confirm':
        return <AlertTriangle className="w-10 h-10 text-amber-500" />;
      default:
        return <Info className="w-10 h-10 text-blue-500" />;
    }
  };

  const getButtonColor = (): 'green' | 'red' | 'orange' | 'blue' => {
    switch (dialog?.type) {
      case 'success':
        return 'green';
      case 'error':
        return 'red';
      case 'confirm':
        return 'orange';
      default:
        return 'blue';
    }
  };

  return (
    <DialogContext.Provider value={{ alert, confirm, success, error }}>
      {children}

      <DialogPrimitive.Root
        open={!!dialog}
        onOpenChange={(open) => !open && closeDialog(dialog?.type === 'confirm' ? false : true)}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
            onEscapeKeyDown={(e) => {
              if (dialog?.type === 'confirm') {
                e.preventDefault();
              }
            }}
            onPointerDownOutside={(e) => {
              if (dialog?.type === 'confirm') {
                e.preventDefault();
              }
            }}>
            {/* Close button for non-confirm dialogs */}
            {dialog?.type !== 'confirm' && (
              <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:pointer-events-none">
                <X className="h-5 w-5 text-gray-500" />
                <span className="sr-only">关闭</span>
              </DialogPrimitive.Close>
            )}

            <div className="flex flex-col items-center text-center">
              {/* Icon */}
              <div className="mb-4">{getIcon()}</div>

              {/* Title */}
              {dialog?.title && (
                <DialogPrimitive.Title className="text-lg font-semibold text-gray-900 mb-2">
                  {dialog.title}
                </DialogPrimitive.Title>
              )}

              {/* Description */}
              <DialogPrimitive.Description className="text-sm text-gray-600 mb-6 whitespace-pre-wrap leading-relaxed">
                {dialog?.message}
              </DialogPrimitive.Description>

              {/* Buttons */}
              <div className="flex gap-3 w-full justify-center">
                {dialog?.type === 'confirm' && (
                  <Button
                    variant="soft"
                    color="gray"
                    size="3"
                    onClick={() => closeDialog(false)}>
                    {dialog.cancelText}
                  </Button>
                )}
                <Button
                  variant="solid"
                  className="px-4"
                  color={getButtonColor()}
                  onClick={() => closeDialog(true)}
                  size="3">
                  {dialog?.confirmText}
                </Button>
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </DialogContext.Provider>
  );
}
