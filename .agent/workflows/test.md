---
description: テストの実行方法
---

# テスト実行ワークフロー

## 全テスト実行

// turbo

1. 全テストを実行する:

```bash
cd /home/soya/projects/NextApp/shift-app && npm test
```

## ウォッチモードで実行（開発中）

2. ウォッチモードで起動（ファイル保存で自動再実行）:

```bash
cd /home/soya/projects/NextApp/shift-app && npm run test:watch
```

## 特定ファイルのみ実行

3. 特定テストファイルだけを実行:

```bash
cd /home/soya/projects/NextApp/shift-app && npx vitest run src/utils/calendar.test.ts
```

---

## テスト追加ガイドライン

- テストファイルは対象ファイルと同じディレクトリに `*.test.ts` として配置
- 例: `src/utils/calendar.ts` → `src/utils/calendar.test.ts`
- `import 'server-only'` を含むモジュールはそのままテスト可能（`vitest.config.ts` でモック済み）
- 外部API（Google Sheets等）を使うモジュールは `vi.mock()` でモック化
