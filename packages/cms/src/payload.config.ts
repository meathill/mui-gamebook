import fs from 'fs';
import path from 'path';
import { sqliteD1Adapter } from '@payloadcms/db-d1-sqlite';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { buildConfig } from 'payload';
import { fileURLToPath } from 'url';
import type { CloudflareContext } from '@opennextjs/cloudflare';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { GetPlatformProxyOptions } from 'wrangler';

import { Users } from './collections/Users';
import { BlogPosts } from './collections/BlogPosts';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const realpath = (value: string) => {
  try {
    return fs.existsSync(value) ? fs.realpathSync(value) : undefined;
  } catch {
    return undefined;
  }
};

const isCLI = process.argv.some((value) => {
  const resolved = realpath(value);
  return resolved ? resolved.endsWith(path.join('payload', 'bin.js')) : false;
});
const isProduction = process.env.NODE_ENV === 'production';

const cloudflare =
  isCLI || !isProduction ? await getCloudflareContextFromWrangler() : await getCloudflareContext({ async: true });

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, BlogPosts],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || 'mui-gamebook-cms-secret-change-me',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: sqliteD1Adapter({
    binding: cloudflare.env.DB,
    tableNamePrefix: 'cms_',
  }),
});

function getCloudflareContextFromWrangler(): Promise<CloudflareContext> {
  return import(/* webpackIgnore: true */ `${'__wrangler'.replaceAll('_', '')}`).then(({ getPlatformProxy }) =>
    getPlatformProxy({
      environment: process.env.CLOUDFLARE_ENV,
      configPath: '../../packages/app/wrangler.jsonc',
      remoteBindings: isProduction,
    } satisfies GetPlatformProxyOptions),
  );
}
