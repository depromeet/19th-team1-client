import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** 조건부 클래스를 합치고, 겹치는 Tailwind 클래스는 뒤의 것만 남긴다 (`px-2` + `px-4` → `px-4`) */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
