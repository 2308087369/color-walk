---
alwaysApply: false
description: 修改前端相关代码时生效
---
1. 前端采用pnpm管理依赖，修改代码后使用eslint进行语法检查
2. 前端开发时默认是dev环境，修改后不需要你主动重启服务（热更新）
3. 前端的api管理统一在“frontend/lib/api.ts”中，所有api都应该在该文件中定义