/**
 * local 命令 - 处理本地文件素材
 */
import { readFile, writeFile } from 'node:fs/promises';
import * as path from 'path';
import { parse, stringify } from '@mui-gamebook/parser';
import { processGame } from '../lib/generator';
import { printUsageStats } from '../lib/usage';

export async function handleLocalCommand(relativePath: string, force: boolean): Promise<void> {
  const filePath = path.resolve(process.cwd(), '../..', relativePath);
  console.log(`处理文件: ${filePath}`);
  console.log(`强制模式: ${force}\n`);

  const fileContent = await readFile(filePath, 'utf-8');
  const parseResult = parse(fileContent);

  if (!parseResult.success) {
    console.error('解析文件失败:', parseResult.error);
    process.exit(1);
  }

  const game = parseResult.data;
  const hasChanged = await processGame(game, force);

  if (hasChanged) {
    console.log('\n素材已更新，正在保存文件...');
    const newFileContent = stringify(game);
    await writeFile(filePath, newFileContent, 'utf-8');
    console.log('文件已更新！');
  } else {
    console.log('无需生成新素材，文件已是最新。');
  }

  printUsageStats();
}
