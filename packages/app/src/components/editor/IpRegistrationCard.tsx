'use client';

import { useEffect, useState } from 'react';
import { ArrowSquareOutIcon, ShieldIcon, SpinnerIcon } from '@phosphor-icons/react/dist/ssr';
import { useDialog } from '@/components/Dialog';

interface IpStatus {
  registered: boolean;
  ipId?: string;
  txHash?: string;
  tokenId?: string;
  registeredAt?: string;
  explorerUrl?: string;
}

interface IpRegistrationCardProps {
  gameId: string;
}

/**
 * Story Protocol IP 版权注册卡片
 */
export default function IpRegistrationCard({ gameId }: IpRegistrationCardProps) {
  const [ipStatus, setIpStatus] = useState<IpStatus | null>(null);
  const [registeringIp, setRegisteringIp] = useState(false);
  const [loadingIpStatus, setLoadingIpStatus] = useState(true);
  const dialog = useDialog();

  useEffect(() => {
    async function fetchIpStatus() {
      try {
        const res = await fetch(`/api/cms/games/${gameId}/register-ip`);
        if (res.ok) {
          const data = (await res.json()) as IpStatus;
          setIpStatus(data);
        }
      } catch (e) {
        console.error('获取 IP 状态失败:', e);
      } finally {
        setLoadingIpStatus(false);
      }
    }
    fetchIpStatus();
  }, [gameId]);

  async function handleRegisterIp() {
    const confirmed = await dialog.confirm(
      '注册 IP 将把您的作品记录在 Story Protocol 区块链上，这个操作不可撤销。确定要继续吗？',
    );
    if (!confirmed) return;

    setRegisteringIp(true);
    try {
      const res = await fetch(`/api/cms/games/${gameId}/register-ip`, { method: 'POST' });
      const data = (await res.json()) as {
        success?: boolean;
        ipId?: string;
        explorerUrl?: string;
        error?: string;
      };
      if (res.ok && data.success) {
        await dialog.success('IP 注册成功！您的作品已被记录在区块链上。');
        setIpStatus({ registered: true, ipId: data.ipId, explorerUrl: data.explorerUrl });
      } else {
        await dialog.error(data.error || 'IP 注册失败');
      }
    } catch (e) {
      await dialog.error('IP 注册失败：' + (e as Error).message);
    } finally {
      setRegisteringIp(false);
    }
  }

  return (
    <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
      <h3 className="text-sm font-medium text-purple-900 mb-2 flex items-center gap-2">
        <ShieldIcon size={16} />
        IP 版权保护
      </h3>
      {loadingIpStatus ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <SpinnerIcon
            size={14}
            className="animate-spin"
          />
          加载中...
        </div>
      ) : ipStatus?.registered ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
              已注册
            </span>
          </div>
          <p className="text-xs text-gray-600 break-all">IP ID: {ipStatus.ipId}</p>
          <a
            href={ipStatus.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800">
            在区块链浏览器查看 <ArrowSquareOutIcon size={12} />
          </a>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-gray-600">
            通过 Story Protocol 将您的作品注册为 IP Asset，在区块链上永久记录您的版权。
          </p>
          <button
            onClick={handleRegisterIp}
            disabled={registeringIp}
            className="w-full py-2 bg-purple-600 text-white rounded text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex justify-center items-center gap-2">
            {registeringIp ? (
              <>
                <SpinnerIcon
                  size={14}
                  className="animate-spin"
                />
                注册中...
              </>
            ) : (
              <>
                <ShieldIcon size={14} />
                注册 IP 版权
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
