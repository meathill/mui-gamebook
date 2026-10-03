import * as fs from 'fs';
import * as path from 'path';
import { parse, type Game } from '@roudanio/parser';

export function generateMermaidGraph(game: Game): string {
  const lines: string[] = ['flowchart TD'];

  for (const [sceneId, scene] of Object.entries(game.scenes)) {
    const isStart = sceneId === 'start';
    let hasOutgoing = false;

    for (const node of scene.nodes) {
      if (node.type === 'choice') {
        hasOutgoing = true;
        const label = node.text ? `|"${node.text.slice(0, 15)}"|` : '';
        lines.push(`  ${sceneId} -->${label} ${node.nextSceneId}`);
      } else if (node.type === 'redirect') {
        hasOutgoing = true;
        lines.push(`  ${sceneId} -.->|redirect| ${node.nextSceneId}`);
      }
    }

    if (!hasOutgoing) {
      // 结局节点样式高亮
      lines.push(`  style ${sceneId} fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#fff`);
    } else if (isStart) {
      lines.push(`  style ${sceneId} fill:#10b981,stroke:#059669,stroke-width:2px,color:#fff`);
    }
  }

  return lines.join('\n');
}

export function exportGraph(
  filePath: string,
  outputPath?: string,
): { success: boolean; content: string; message: string } {
  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    return { success: false, content: '', message: `文件不存在: ${filePath}` };
  }

  const raw = fs.readFileSync(resolved, 'utf-8');
  const res = parse(raw);
  if (!res.success) {
    return { success: false, content: '', message: `剧本解析失败: ${res.error}` };
  }

  const mermaid = generateMermaidGraph(res.data);
  if (outputPath) {
    const outResolved = path.resolve(process.cwd(), outputPath);
    fs.writeFileSync(outResolved, mermaid, 'utf-8');
    return { success: true, content: mermaid, message: `成功导出 Mermaid 拓扑图至: ${outputPath}` };
  }

  return { success: true, content: mermaid, message: 'Mermaid 拓扑图生成成功' };
}
