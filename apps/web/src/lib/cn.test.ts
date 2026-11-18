import { describe, expect, it } from 'vitest';

import { cn } from './cn';

describe('cn', () => {
  it('조건이 거짓인 클래스는 빠진다', () => {
    expect(cn('p-2', false && 'hidden', undefined, 'text-sm')).toBe(
      'p-2 text-sm',
    );
  });

  it('같은 속성의 Tailwind 클래스가 겹치면 뒤의 것만 남는다', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });
});
