/**
 * conversation-queue.ts
 *
 * Problème résolu : plusieurs messages envoyés en quelques secondes -> traitements en parallèle
 * -> états Mongo qui se marchent dessus, réponses en double, messages d'erreur en double.
 *
 * 1) runExclusive : un seul traitement à la fois PAR conversation, dans l'ordre d'arrivée.
 * 2) createDebouncer : regroupe les messages rapprochés d'un même patient en UN seul traitement.
 *
 * Limite : en mémoire = valable pour une instance backend.
 */

const tails = new Map<string, Promise<unknown>>();

export function runExclusive<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = tails.get(key) ?? Promise.resolve();
  const next = prev.catch(() => undefined).then(fn);
  tails.set(key, next);
  next
    .finally(() => {
      if (tails.get(key) === next) tails.delete(key);
    })
    .catch(() => undefined);
  return next;
}

interface Bucket<T> {
  items: T[];
  timer: ReturnType<typeof setTimeout>;
  firstAt: number;
}

/**
 * push(key, item, flush) : attend `waitMs` après le DERNIER message (3,5 s par défaut),
 * sans dépasser `maxWaitMs` après le premier. flush reçoit tous les messages du lot,
 * exécutés sous runExclusive(key).
 */
export function createDebouncer(waitMs = 3500, maxWaitMs = 8000) {
  const buckets = new Map<string, Bucket<unknown>>();

  return function push<T>(key: string, item: T, flush: (items: T[]) => Promise<void>): void {
    const now = Date.now();
    const existing = buckets.get(key) as Bucket<T> | undefined;
    if (existing) clearTimeout(existing.timer);

    const items = existing ? [...existing.items, item] : [item];
    const firstAt = existing?.firstAt ?? now;
    const delay = Math.max(0, Math.min(waitMs, firstAt + maxWaitMs - now));

    const timer = setTimeout(() => {
      buckets.delete(key);
      runExclusive(key, () => flush(items)).catch((err) =>
        console.error("[conversation-queue] flush failed:", (err as Error).message)
      );
    }, delay);

    buckets.set(key, { items, timer, firstAt } as Bucket<unknown>);
  };
}
