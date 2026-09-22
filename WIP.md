# WIP

## MCP 鉴权升级为 API Key

- 已实现 better-auth `@better-auth/api-key` + `/my/api-keys` + MCP Bearer 校验
- 待用户：部署生产 + `pnpm --filter @mui-gamebook/app run db:migrate:remote` + 在网页创建 key 写入 `.mimocode/mimocode.jsonc`
