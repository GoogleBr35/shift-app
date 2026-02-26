---
description: テストの実行方法
---

# テストコードルール

## テストスタイル

**古典派テスト（振る舞いの検証）** を採用します。
実装の詳細ではなく、外部から観察可能な振る舞いをテストしてください。
実装する際は`テスト作成スキル`に記載の通りに作業を進めてください。

# テスト作成スキル

## テストの構成

**テーブルテスト + Given-When-Then パターン** を採用します。

- テーブルテストで複数のケースを効率的に記述
- 各ケースの構造を Given-When-Then で整理

## テストメソッドの命名

ビジネス上の意味が伝わる名前をつけます。

| 観点 | ガイドライン |
|------|--------------|
| 対象読者 | 非開発者にも伝わる |
| 内容 | ビジネス上の意味を伝える |
| 禁止 | メソッド名をテスト名に含めない |


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