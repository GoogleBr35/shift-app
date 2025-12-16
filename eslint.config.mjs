import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import eslintConfigPrettier from 'eslint-config-prettier';

const eslintConfig = defineConfig([
    ...nextVitals,
    ...nextTs,
    // Override default ignores of eslint-config-next.
    globalIgnores([
        // Default ignores of eslint-config-next:
        '.next/**',
        'out/**',
        'build/**',
        'next-env.d.ts',
    ]),
    // 1. 対象ファイルの指定
    { files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'] },

    // 2. 基本的な推奨ルールの適用
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
    // 4. カスタム設定
    {
        languageOptions: {
            globals: globals.browser, // ブラウザ環境のグローバル変数を許可
        },
        plugins: {
            'react-hooks': pluginReactHooks,
        },
        rules: {
            // 必要に応じてルールを上書き
            ...pluginReactHooks.configs.recommended.rules, // React Hooksの推奨ルール
            'no-console': 'warn', // console.logを警告にする等
        },
    },

    // 5. Prettierとの競合回避 (必ず最後に記述)
    eslintConfigPrettier,
]);

export default eslintConfig;
