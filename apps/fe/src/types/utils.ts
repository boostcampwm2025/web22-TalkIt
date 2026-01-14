/**
 * T의 모든 속성을 nullable로 만듭니다
 */
export type Nullable<T> = { [K in keyof T]: T[K] | null };
