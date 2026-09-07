import type { NodeKind } from '@/types/campus';
import type { CampusGraph, Link } from './graph';
import { costFor, type RouteOptions } from './cost';

/** 최소 힙. 노드가 백 개 남짓이라 배열 훑기로도 되지만, 힙이 더 읽기 쉽다. */
class MinHeap {
  private items: { id: string; cost: number }[] = [];

  get size() {
    return this.items.length;
  }

  push(id: string, cost: number) {
    this.items.push({ id, cost });
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.items[parent].cost <= this.items[i].cost) break;
      [this.items[parent], this.items[i]] = [this.items[i], this.items[parent]];
      i = parent;
    }
  }

  pop() {
    const top = this.items[0];
    const last = this.items.pop()!;
    if (this.items.length > 0) {
      this.items[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let min = i;
        if (l < this.items.length && this.items[l].cost < this.items[min].cost)
          min = l;
        if (r < this.items.length && this.items[r].cost < this.items[min].cost)
          min = r;
        if (min === i) break;
        [this.items[min], this.items[i]] = [this.items[i], this.items[min]];
        i = min;
      }
    }
    return top;
  }
}

/** 지나온 길을 되짚기 위한 발자국. */
export interface Step {
  link: Link;
  from: string;
}

/**
 * 건물을 **지나쳐 갈 수 있는지**.
 *
 * 건물은 가장 가까운 길목에 접속선으로 매달려 있다. 접속선은 실제 출입구가
 * 아니라 「여기서 저 길로 나갈 수 있다」는 모형이고, 좌표도 건물 **중심**이다.
 * 그래서 접속선 두 가닥을 이어 붙이면 건물 한복판을 뚫고 지나가는 길이 된다 —
 * 실제로는 건물을 빙 둘러 가야 하므로 그만큼 짧게 잡힌다.
 *
 * 건물 안을 정말로 가로지르는 길은 따로 있다. surface 가 'indoor' 인 간선이고,
 * 문 닫힌 시간엔 allowIndoor 로 끈다. 그러니 접속선으로는 못 지나가게 막는다.
 *
 * 문(gate)은 막지 않는다 — 문은 건물이 아니라 길의 일부다.
 */
const canPassThrough = (kind: NodeKind): boolean =>
  kind !== 'building' && kind !== 'place';

/**
 * from 에서 to 까지 옵션 기준으로 가장 싼 길.
 * 못 가면 null. 간선 비용이 음수가 될 일이 없어 A* 대신 다익스트라로 충분하다.
 */
export const shortestPath = (
  graph: CampusGraph,
  from: string,
  to: string,
  options: RouteOptions,
): Step[] | null => {
  if (from === to) return [];
  if (!graph.nodes.has(from) || !graph.nodes.has(to)) return null;

  const best = new Map<string, number>([[from, 0]]);
  const came = new Map<string, Step>();
  const settled = new Set<string>();
  const queue = new MinHeap();
  queue.push(from, 0);

  while (queue.size > 0) {
    const { id, cost } = queue.pop();
    if (settled.has(id)) continue;
    settled.add(id);
    if (id === to) break;

    /* 출발지가 건물인 것은 당연하고, 남의 건물을 관통해 가는 것만 막는다. */
    const kind = graph.nodes.get(id)?.kind;
    if (id !== from && kind && !canPassThrough(kind)) continue;

    for (const link of graph.links.get(id) ?? []) {
      if (settled.has(link.to)) continue;

      const weight = costFor(link.edge, link.meters, options);
      if (!Number.isFinite(weight)) continue;

      const next = cost + weight;
      if (next < (best.get(link.to) ?? Infinity)) {
        best.set(link.to, next);
        came.set(link.to, { link, from: id });
        queue.push(link.to, next);
      }
    }
  }

  if (!came.has(to)) return null;

  const steps: Step[] = [];
  for (let at = to; at !== from;) {
    const step = came.get(at)!;
    steps.push(step);
    at = step.from;
  }
  return steps.reverse();
};
