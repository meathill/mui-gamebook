import { uploadGame } from '../packages/asset-generator/src/commands/upload-game';

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        parsed[key] = args[i + 1];
        i++;
      } else {
        parsed[key] = true;
      }
    }
  }
  return parsed;
}

const argv = parseArgs();
const file = argv.file as string;
const assets = argv.assets as string;
const slug = argv.slug as string;
const dryRun = !!argv.dryRun;

if (!file || !assets || !slug) {
  console.error(
    'Usage: npx tsx scripts/upload-game-assets.ts --file <path/to/script.md> --assets <path/to/assets> --slug <game-slug>',
  );
  process.exit(1);
}

uploadGame({ file, assets, slug, dryRun })
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
