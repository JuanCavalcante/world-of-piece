/**
 * Declaração mínima de `bun:test` para o typecheck (os testes rodam com `bun test`).
 * Evita puxar @types/bun, que altera o tipo global de `fetch` e quebra os clients Supabase.
 */
declare module "bun:test" {
  export function describe(name: string, fn: () => void): void;
  export function test(name: string, fn: () => void | Promise<void>): void;
  export function beforeEach(fn: () => void): void;
  export function afterEach(fn: () => void): void;
  interface Matchers {
    toBe(expected: unknown): void;
    toEqual(expected: unknown): void;
    toBeNull(): void;
    toBeUndefined(): void;
    toBeTruthy(): void;
    toBeFalsy(): void;
    toBeGreaterThan(n: number): void;
    toBeGreaterThanOrEqual(n: number): void;
    toBeLessThan(n: number): void;
    toBeLessThanOrEqual(n: number): void;
    toContain(item: unknown): void;
    toHaveLength(n: number): void;
    readonly not: Matchers;
  }
  export function expect(actual: unknown): Matchers;
}
