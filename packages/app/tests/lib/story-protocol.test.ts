import { beforeEach, describe, expect, it, vi } from 'vitest';

// createStoryClient/getIpInfo 内部直接 new 出 viem 的 client 对象，没有依赖注入点。
// 只 mock createWalletClient/createPublicClient 两个构造函数，其余（http、真实的
// privateKeyToAccount 校验逻辑、aeneid 链配置）保持真实，这样才能测到"非法私钥同步
// 抛错"这种不需要网络的真实行为，而不是测一堆互相调用的 mock。
vi.mock('viem', async (importOriginal) => {
  const actual = await importOriginal<typeof import('viem')>();
  return {
    ...actual,
    createWalletClient: vi.fn(),
    createPublicClient: vi.fn(),
  };
});

vi.mock('@story-protocol/core-sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@story-protocol/core-sdk')>();
  return {
    ...actual,
    StoryClient: { newClient: vi.fn() },
  };
});

import type { StoryClient } from '@story-protocol/core-sdk';
import { createPublicClient, createWalletClient } from 'viem';
import {
  createStoryClient,
  generateIpMetadataJson,
  getIpInfo,
  type IpMetadataInput,
  registerGameAsIp,
  uploadMetadataToIpfs,
} from '@/lib/story-protocol';

const metadata: IpMetadataInput = {
  title: '小红帽',
  description: '一个关于森林的故事',
  creatorName: 'Meathill',
  creatorEmail: 'a@b.com',
  coverImage: 'https://cdn.x.com/cover.png',
  createdAt: '2026-07-01T00:00:00.000Z',
};

describe('generateIpMetadataJson', () => {
  it('生成符合 Story Protocol 标准的元数据 JSON', () => {
    const json = JSON.parse(generateIpMetadataJson(metadata));

    expect(json.name).toBe('小红帽');
    expect(json.description).toBe('一个关于森林的故事');
    expect(json.image).toBe('https://cdn.x.com/cover.png');
    expect(json.attributes).toEqual([
      { trait_type: 'Creator', value: 'Meathill' },
      { trait_type: 'Creator Email', value: 'a@b.com' },
      { trait_type: 'Created At', value: '2026-07-01T00:00:00.000Z' },
      { trait_type: 'Platform', value: 'MUI Gamebook' },
      { trait_type: 'Type', value: 'Interactive Story' },
    ]);
  });

  it('没有封面图时 image 字段为空字符串', () => {
    const json = JSON.parse(generateIpMetadataJson({ ...metadata, coverImage: undefined }));

    expect(json.image).toBe('');
  });
});

describe('uploadMetadataToIpfs', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('成功时返回 ipfs:// URI', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ IpfsHash: 'Qm123' }) }));

    const uri = await uploadMetadataToIpfs(metadata, 'jwt-token');

    expect(uri).toBe('ipfs://Qm123');
    expect(fetch).toHaveBeenCalledWith(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer jwt-token' }),
      }),
    );
  });

  it('Pinata 返回非 2xx 时抛错', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, text: () => Promise.resolve('quota exceeded') }));

    await expect(uploadMetadataToIpfs(metadata, 'jwt-token')).rejects.toThrow('quota exceeded');
  });
});

describe('registerGameAsIp', () => {
  it('成功路径：返回 txHash/ipId/tokenId/explorerUrl', async () => {
    const storyClient = {
      ipAsset: {
        generateIpMetadata: vi.fn().mockReturnValue({ ipMetadataHash: '0xaaa', nftMetadataHash: '0xbbb' }),
        registerIpAsset: vi.fn().mockResolvedValue({
          ipId: '0xIpId',
          txHash: '0xTxHash',
          tokenId: BigInt(42),
        }),
      },
    } as unknown as StoryClient;

    const result = await registerGameAsIp(storyClient, metadata, 'ipfs://Qm123');

    expect(result).toEqual({
      txHash: '0xTxHash',
      ipId: '0xIpId',
      tokenId: BigInt(42),
      explorerUrl: 'https://aeneid.explorer.story.foundation/ipa/0xIpId',
    });
  });

  it('SDK 未返回 ipId/txHash 时抛错', async () => {
    const storyClient = {
      ipAsset: {
        generateIpMetadata: vi.fn().mockReturnValue({ ipMetadataHash: '0xaaa', nftMetadataHash: '0xbbb' }),
        registerIpAsset: vi.fn().mockResolvedValue({}),
      },
    } as unknown as StoryClient;

    await expect(registerGameAsIp(storyClient, metadata, 'ipfs://Qm123')).rejects.toThrow(
      '注册 IP 失败：未返回有效的 IP ID 或交易哈希',
    );
  });

  it('SDK 未返回 tokenId 时回退为 0', async () => {
    const storyClient = {
      ipAsset: {
        generateIpMetadata: vi.fn().mockReturnValue({ ipMetadataHash: '0xaaa', nftMetadataHash: '0xbbb' }),
        registerIpAsset: vi.fn().mockResolvedValue({ ipId: '0xIpId', txHash: '0xTxHash' }),
      },
    } as unknown as StoryClient;

    const result = await registerGameAsIp(storyClient, metadata, 'ipfs://Qm123');

    expect(result.tokenId).toBe(BigInt(0));
  });
});

describe('createStoryClient', () => {
  it('私钥格式非法时同步抛错，不需要网络也能测到', () => {
    expect(() => createStoryClient('not-a-valid-private-key')).toThrow();
  });

  it('私钥格式合法时构造钱包客户端和 Story 客户端', () => {
    (createWalletClient as ReturnType<typeof vi.fn>).mockReturnValue({ account: {} });

    // 公开的 Hardhat/Anvil 默认测试账户私钥 #0，业界测试代码通用惯例，不持有真实资金
    const { account } = createStoryClient('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80');

    expect(account.address).toBe('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
    expect(createWalletClient).toHaveBeenCalledTimes(1);
  });
});

describe('getIpInfo', () => {
  it('地址有合约代码时 exists 为 true', async () => {
    const getCode = vi.fn().mockResolvedValue('0x60006000');
    (createPublicClient as ReturnType<typeof vi.fn>).mockReturnValue({ getCode });

    const result = await getIpInfo('0xIpId');

    expect(result).toEqual({
      exists: true,
      explorerUrl: 'https://aeneid.explorer.story.foundation/ipa/0xIpId',
    });
  });

  it('地址没有代码（返回 0x）时 exists 为 false', async () => {
    const getCode = vi.fn().mockResolvedValue('0x');
    (createPublicClient as ReturnType<typeof vi.fn>).mockReturnValue({ getCode });

    const result = await getIpInfo('0xIpId');

    expect(result.exists).toBe(false);
  });
});
