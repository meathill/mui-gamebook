type JsonLdData = Record<string, unknown>;

// 转义 < 防止内容中出现 </script> 提前闭合标签
function serialize(data: JsonLdData): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export default function JsonLd({ data }: { data: JsonLdData }) {
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD 需要原样输出 JSON 文本
      dangerouslySetInnerHTML={{ __html: serialize(data) }}
    />
  );
}
