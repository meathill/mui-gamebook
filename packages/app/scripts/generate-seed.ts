import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from '@mui-gamebook/parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const demoDir = path.resolve(__dirname, '../../../demo');
const outputFile = path.resolve(__dirname, '../migrations/0002_seed.sql');

function escapeSql(str: string | undefined): string {
  if (!str) return 'NULL';
  return '\'' + str.replace(/'/g, '\'\'') + '\'';
}

function generateSeed() {
  if (!fs.existsSync(demoDir)) {
    console.error(`Demo directory not found at: ${demoDir}`);
    process.exit(1);
  }

  // Check for command line argument
  const targetFile = process.argv[ 2 ];
  let files: string[] = [];

  if (targetFile) {
    const fileName = targetFile.endsWith('.md') ? targetFile : `${targetFile}.md`;
    const fullPath = path.join(demoDir, fileName);
    if (fs.existsSync(fullPath)) {
      files = [fileName];
      console.log(`Targeting specific file: ${fileName}`);
    } else {
      console.error(`File not found: ${fileName} in ${demoDir}`);
      process.exit(1);
    }
  } else {
    files = fs.readdirSync(demoDir).filter(file => file.endsWith('.md'));
    console.log(`Targeting all .md files in ${demoDir}`);
  }

  let sql = '';

  for (const file of files) {
    const content = fs.readFileSync(path.join(demoDir, file), 'utf-8');
    const result = parse(content);

    if (result.success) {
      const slug = file.replace('.md', '');
      const { title, description, cover_image, tags, published } = result.data;
      const now = Date.now();

      const tagsJson = tags ? JSON.stringify(tags) : '[]';
      const publishedInt = published ? 1 : 0;

      sql += `INSERT OR REPLACE INTO Games (slug, title, description, cover_image, tags, published, created_at, updated_at) VALUES (${escapeSql(slug)}, ${escapeSql(title)}, ${escapeSql(description)}, ${escapeSql(cover_image)}, ${escapeSql(tagsJson)}, ${publishedInt}, ${now}, ${now});\n`;

      sql += `INSERT OR REPLACE INTO GameContent (slug, content) VALUES (${escapeSql(slug)}, ${escapeSql(content)});\n\n`;

      console.log(`Processed: ${slug}`);
    } else {
      console.warn(`Skipping ${file}: ${result.error}`);
    }
  }

  fs.writeFileSync(outputFile, sql);
  console.log(`Seed SQL generated at: ${outputFile}`);
}

generateSeed();
