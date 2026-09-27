import { startPreviewServer } from '../preview/server';
import { colors } from '../utils/colors';

export interface PreviewCliOptions {
  port?: number;
  open?: boolean;
}

export async function previewCommand(filePath: string, options: PreviewCliOptions = {}): Promise<void> {
  try {
    const instance = await startPreviewServer({
      filePath,
      port: options.port,
    });

    console.log('');
    console.log(colors.bold(colors.green('🚀 Mui Gamebook 本地即时预览服务器已启动！')));
    console.log(`  • 访问地址: ${colors.bold(colors.cyan(instance.url))}`);
    console.log(`  • 正在监听: ${colors.yellow(filePath)} (保存文件即可热更新)`);
    console.log(colors.dim('  • 快捷键: 按 Ctrl+C 停止服务'));
    console.log('');

    const cleanup = async () => {
      console.log('\n' + colors.dim('正在停止预览服务...'));
      await instance.close();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  } catch (err) {
    console.error(colors.red(`启动预览服务失败: ${(err as Error).message}`));
    process.exit(1);
  }
}
