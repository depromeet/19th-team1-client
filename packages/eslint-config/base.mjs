// 모든 워크스페이스가 공통으로 지키는 규칙.
// 프레임워크 규칙은 각 프레임워크 공식 설정(next.mjs, expo.mjs)에 맡기고, 여기에는 팀 규칙만 둔다.
// TS 파일로 범위를 묶는다 — Expo 공식 설정은 @typescript-eslint 플러그인을 TS 파일에만 등록해서,
// 범위 없이 걸면 .js 설정 파일에서 "플러그인을 찾을 수 없음" 에러가 난다.

/** @type {import('eslint').Linter.Config[]} */
export const teamRules = [
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    rules: {
      // any 는 타입 검사를 끈다 — unknown 으로 받고 좁혀서 쓴다
      '@typescript-eslint/no-explicit-any': 'error',
      // 일부러 안 쓰는 값은 _ 로 시작해 표시한다
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // import 순서 — react·next → 외부 패키지 → 우리 워크스페이스(@team1) → 앱 내부(@/) → 상대 경로.
      // 줄 순서만 바뀐 diff 를 없앤다. --fix 가 자동으로 정렬한다.
      // import 플러그인은 Next·Expo 공식 설정에 들어 있다.
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'unknown',
            ['parent', 'sibling', 'index'],
          ],
          pathGroups: [
            {
              pattern: '{react,react-dom,react-native,next,next/**}',
              group: 'external',
              position: 'before',
            },
            { pattern: '@team1/**', group: 'internal', position: 'before' },
            { pattern: '@/**', group: 'internal', position: 'after' },
          ],
          // 기본값은 external 에 pathGroups 를 적용하지 않아 react·next 를 앞으로 못 뺀다
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },
];
