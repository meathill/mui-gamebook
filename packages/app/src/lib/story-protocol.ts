import { StoryClient, StoryConfig } from '@story-protocol/core-sdk';
import { http, createWalletClient, createPublicClient, type Address, type WalletClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { aeneid } from '@story-protocol/core-sdk';

// Story Protocol 配置
const STORY_RPC_URL = 'https://aeneid.storyrpc.io';
const SPG_NFT_CONTRACT = '0xc32A8a0FF3beDDDa58393d022aF433e78739FAbc' as Address;

// IP 元数据类型
export interface IpMetadataInput {
  title: string;
  description: string;
  creatorName: string;
  creatorEmail: string;
  coverImage?: string;
  createdAt: string;
}

// 注册结果
export interface RegisterIpResult {
  txHash: string;
  ipId: Address;
  tokenId: bigint;
  explorerUrl: string;
}

/**
 * 创建 Story Protocol 客户端
 * 使用服务端私钥签名交易
 */
export function createStoryClient(privateKey: string): {
  storyClient: StoryClient;
  walletClient: WalletClient;
  account: ReturnType<typeof privateKeyToAccount>;
} {
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  
  const walletClient = createWalletClient({
    account,
    chain: aeneid,
    transport: http(STORY_RPC_URL),
  });
  
  const config: StoryConfig = {
    wallet: walletClient,
    transport: http(STORY_RPC_URL),
    chainId: 'aeneid',
  };
  
  const storyClient = StoryClient.newClient(config);
  
  return { storyClient, walletClient, account };
}

/**
 * 生成 IP 元数据 JSON
 * 符合 Story Protocol 的 IP 元数据标准
 */
export function generateIpMetadataJson(metadata: IpMetadataInput): string {
  const ipMetadata = {
    name: metadata.title,
    description: metadata.description,
    image: metadata.coverImage || '',
    attributes: [
      { trait_type: 'Creator', value: metadata.creatorName },
      { trait_type: 'Creator Email', value: metadata.creatorEmail },
      { trait_type: 'Created At', value: metadata.createdAt },
      { trait_type: 'Platform', value: 'MUI Gamebook' },
      { trait_type: 'Type', value: 'Interactive Story' },
    ],
  };
  
  return JSON.stringify(ipMetadata);
}

/**
 * 上传元数据到 IPFS（通过 Pinata）
 * 返回 IPFS URI
 */
export async function uploadMetadataToIpfs(
  metadata: IpMetadataInput,
  pinataJwt: string
): Promise<string> {
  const metadataJson = generateIpMetadataJson(metadata);
  
  const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${pinataJwt}`,
    },
    body: JSON.stringify({
      pinataContent: JSON.parse(metadataJson),
      pinataMetadata: {
        name: `${metadata.title}-metadata.json`,
      },
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`上传元数据到 IPFS 失败: ${error}`);
  }
  
  const result = await response.json() as { IpfsHash: string };
  return `ipfs://${result.IpfsHash}`;
}

/**
 * 注册游戏为 IP Asset
 * 使用新的 registerIpAsset 统一入口方法
 */
export async function registerGameAsIp(
  storyClient: StoryClient,
  metadata: IpMetadataInput,
  metadataUri: string,
): Promise<RegisterIpResult> {
  // 使用 SDK 提供的方法生成元数据
  const ipMetadata = storyClient.ipAsset.generateIpMetadata({
    title: metadata.title,
    description: metadata.description,
    ipType: 'Story',
    attributes: [
      { key: 'Creator', value: metadata.creatorName },
      { key: 'Platform', value: 'MUI Gamebook' },
      { key: 'Type', value: 'Interactive Story' },
    ],
  });
  
  // 使用新的统一入口 registerIpAsset，支持 mint-on-demand
  const response = await storyClient.ipAsset.registerIpAsset({
    nft: {
      type: 'mint',
      spgNftContract: SPG_NFT_CONTRACT,
    },
    ipMetadata: {
      ipMetadataURI: metadataUri,
      ipMetadataHash: ipMetadata.ipMetadataHash as `0x${string}`,
      nftMetadataURI: metadataUri,
      nftMetadataHash: ipMetadata.nftMetadataHash as `0x${string}`,
    },
  });
  
  if (!response.ipId || !response.txHash) {
    throw new Error('注册 IP 失败：未返回有效的 IP ID 或交易哈希');
  }
  
  return {
    txHash: response.txHash,
    ipId: response.ipId as Address,
    tokenId: response.tokenId || BigInt(0),
    explorerUrl: `https://aeneid.explorer.story.foundation/ipa/${response.ipId}`,
  };
}

/**
 * 获取 IP 信息
 */
export async function getIpInfo(ipId: Address): Promise<{
  exists: boolean;
  explorerUrl: string;
}> {
  const publicClient = createPublicClient({
    chain: aeneid,
    transport: http(STORY_RPC_URL),
  });
  
  // 简单检查地址是否有代码（是否是有效的合约/IP）
  const code = await publicClient.getCode({ address: ipId });
  
  return {
    exists: code !== undefined && code !== '0x',
    explorerUrl: `https://aeneid.explorer.story.foundation/ipa/${ipId}`,
  };
}
