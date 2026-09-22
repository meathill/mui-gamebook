/**
 * MCP Streamable HTTP（2026-07-28）协议面：header/_meta 校验、Origin、per-request 鉴权。
 * 传输层无状态：不读 Mcp-Session-Id，不依赖 initialize 握手。
 */
import { getPublicSiteUrl } from '@mui-gamebook/site-common/utils';
import type { SessionLike } from '@/lib/game-access';

export const MCP_SERVER_NAME = 'mui-gamebook-mcp';
export const MCP_SERVER_VERSION = '0.3.0';
export const MCP_PROTOCOL_VERSION = '2026-07-28';
/** legacy 握手协议（MiMoCode 等客户端仍在用） */
export const MCP_LEGACY_PROTOCOL_VERSION = '2025-03-26';
export const MCP_SUPPORTED_PROTOCOL_VERSIONS = [MCP_PROTOCOL_VERSION] as const;

export const MCP_ERROR_HEADER_MISMATCH = -32020;
export const MCP_ERROR_UNSUPPORTED_PROTOCOL_VERSION = -32022;

export interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

export interface McpRequestMeta {
  'io.modelcontextprotocol/protocolVersion'?: unknown;
  'io.modelcontextprotocol/clientCapabilities'?: unknown;
  'io.modelcontextprotocol/clientInfo'?: unknown;
}

export type McpAuth = { mode: 'admin' } | { mode: 'session'; session: SessionLike };

export interface McpValidationFailure {
  code: number;
  message: string;
  data?: unknown;
}

export function mcpServerMeta() {
  return {
    'io.modelcontextprotocol/serverInfo': {
      name: MCP_SERVER_NAME,
      version: MCP_SERVER_VERSION,
    },
  };
}

function readRequestMeta(params: Record<string, unknown> | undefined): McpRequestMeta | null {
  const meta = params?._meta;
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null;
  return meta as McpRequestMeta;
}

/** Origin 白名单：缺失放行（非浏览器 client）；存在则必须命中 */
export function isOriginAllowed(req: Request, envMap?: Record<string, unknown>): boolean {
  const origin = req.headers.get('Origin');
  if (!origin) return true;

  const env = envMap || (typeof process !== 'undefined' ? process.env : {});
  const allowed = new Set<string>();

  try {
    allowed.add(new URL(getPublicSiteUrl(env.NEXT_PUBLIC_SITE_URL as string | undefined)).origin);
  } catch {
    // ignore malformed site url
  }

  const host = req.headers.get('Host');
  if (host) {
    const proto = (req.headers.get('X-Forwarded-Proto') || 'https').split(',')[0].trim() || 'https';
    allowed.add(`${proto}://${host}`);
  }

  const extra = env.MCP_ALLOWED_ORIGINS;
  if (typeof extra === 'string' && extra.trim()) {
    for (const item of extra.split(',')) {
      const value = item.trim();
      if (value) {
        try {
          allowed.add(new URL(value).origin);
        } catch {
          allowed.add(value);
        }
      }
    }
  }

  return allowed.has(origin);
}

export function isBearerAdmin(req: Request, env: { ADMIN_PASSWORD?: string }): boolean {
  const secret = env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  const authHeader = req.headers.get('Authorization');
  return Boolean(secret && authHeader === `Bearer ${secret}`);
}

/**
 * Dual-era 判定：带 modern header 或 body _meta.protocolVersion 走 2026-07-28；
 * 否则视为 legacy（initialize 握手，2025-03-26），供 MiMoCode 等客户端使用。
 */
export function isModernMcpRequest(req: Request, body: JsonRpcRequest): boolean {
  if (req.headers.get('MCP-Protocol-Version')) return true;
  const meta = readRequestMeta(body.params);
  return typeof meta?.['io.modelcontextprotocol/protocolVersion'] === 'string';
}

/**
 * 校验 modern Streamable HTTP 请求的 header 与 _meta。
 * 返回 null 表示通过。
 */
export function validateMcpTransport(req: Request, body: JsonRpcRequest): McpValidationFailure | null {
  const protocolHeader = req.headers.get('MCP-Protocol-Version');
  const methodHeader = req.headers.get('Mcp-Method');
  const nameHeader = req.headers.get('Mcp-Name');
  const method = body.method;
  const params = body.params;
  const meta = readRequestMeta(params);

  if (!protocolHeader || !methodHeader) {
    return {
      code: MCP_ERROR_HEADER_MISMATCH,
      message: 'Missing required headers: MCP-Protocol-Version and Mcp-Method',
    };
  }

  if (methodHeader !== method) {
    return {
      code: MCP_ERROR_HEADER_MISMATCH,
      message: `Mcp-Method header mismatch: header='${methodHeader}' body='${method ?? ''}'`,
    };
  }

  const metaVersion = meta?.['io.modelcontextprotocol/protocolVersion'];
  if (typeof metaVersion !== 'string' || !metaVersion) {
    return {
      code: -32602,
      message: 'Missing required _meta field: io.modelcontextprotocol/protocolVersion',
    };
  }

  if (protocolHeader !== metaVersion) {
    return {
      code: MCP_ERROR_HEADER_MISMATCH,
      message: `MCP-Protocol-Version header mismatch: header='${protocolHeader}' meta='${metaVersion}'`,
    };
  }

  if (!(MCP_SUPPORTED_PROTOCOL_VERSIONS as readonly string[]).includes(protocolHeader)) {
    return {
      code: MCP_ERROR_UNSUPPORTED_PROTOCOL_VERSION,
      message: 'Unsupported protocol version',
      data: {
        supported: [...MCP_SUPPORTED_PROTOCOL_VERSIONS],
        requested: protocolHeader,
      },
    };
  }

  const clientCapabilities = meta?.['io.modelcontextprotocol/clientCapabilities'];
  if (!clientCapabilities || typeof clientCapabilities !== 'object' || Array.isArray(clientCapabilities)) {
    return {
      code: -32602,
      message: 'Missing required _meta field: io.modelcontextprotocol/clientCapabilities',
    };
  }

  if (method === 'tools/call') {
    const toolName = params?.name;
    if (typeof toolName !== 'string' || !toolName) {
      return { code: -32602, message: 'Missing params.name' };
    }
    if (!nameHeader) {
      return {
        code: MCP_ERROR_HEADER_MISMATCH,
        message: 'Missing required header: Mcp-Name',
      };
    }
    if (nameHeader !== toolName) {
      return {
        code: MCP_ERROR_HEADER_MISMATCH,
        message: `Mcp-Name header mismatch: header='${nameHeader}' body='${toolName}'`,
      };
    }
  }

  return null;
}

export function modernRpcHeaders(
  body: {
    method: string;
    params?: { name?: string; _meta?: Record<string, unknown> };
  },
  extra?: HeadersInit,
): Headers {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('MCP-Protocol-Version', MCP_PROTOCOL_VERSION);
  headers.set('Mcp-Method', body.method);
  const toolName = body.params?.name;
  if (toolName) headers.set('Mcp-Name', toolName);
  if (extra) {
    new Headers(extra).forEach((value, key) => {
      headers.set(key, value);
    });
  }
  return headers;
}

export function withModernMeta(params?: Record<string, unknown>): Record<string, unknown> {
  return {
    ...(params || {}),
    _meta: {
      'io.modelcontextprotocol/protocolVersion': MCP_PROTOCOL_VERSION,
      'io.modelcontextprotocol/clientCapabilities': {},
      ...(params?._meta && typeof params._meta === 'object' ? (params._meta as object) : {}),
    },
  };
}
