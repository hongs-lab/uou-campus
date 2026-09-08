/**
 * 끊어진 길 잇기.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * OpenStreetMap 에서는 계단과 보행로를 **따로** 그려 둔 자리가 많습니다. 눈으로
 * 보면 붙어 있는데 점을 공유하지 않아서, 그래프에서는 계단이 허공에서 끝납니다.
 * 길찾기는 그런 계단을 못 타고 한참 삥 돌아갑니다.
 *
 * 실제로 울산대 캠퍼스 시드에서 계단 33개 가운데 9개가 이렇게 막다른 길이었고,
 * 보행로·차도까지 합치면 막다른 길목이 50개가 넘었습니다. 박물관 옆 계단은
 * 차도에서 **0.8m** 떨어진 채 끊겨 있었습니다.
 *
 * 여기서 하는 일은 하나뿐입니다 — **막다른 길목이 다른 길에 코앞까지 닿아 있으면
 * 그 자리에서 이어 붙인다.** 없는 길을 지어내지 않으려고 두 가지를 지킵니다.
 *
 *   1. 가까울 때만 : 벌어진 틈이 LIMIT 를 넘으면 손대지 않습니다. 틈이 멀면
 *                    그건 OSM 의 실수가 아니라 원래 거기서 끝나는 길입니다.
 *   2. 이득이 클 때만: 지금도 비슷한 품으로 그 자리에 갈 수 있으면 잇지 않습니다.
 *                    이어 봐야 그림만 지저분해지고 경로는 그대로입니다.
 *
 * 시드가 만들 때도 이 단계를 거치고(scripts/seed-campus.mjs), 이미 만들어 둔
 * 지도에 뒤늦게 적용할 수도 있습니다. 후자가 이 파일의 CLI 입니다.
 *
 *   node scripts/mend-graph.mjs --dry   # 무엇을 이을지 보기만
 *   node scripts/mend-graph.mjs         # src/data/campus.json 에 반영
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * 길찾기가 실제로 쓰는 비용 셈을 그대로 들여온다. 계단 어귀 단계는 「이 가닥을
 * 놓으면 길이 되레 길어지지 않는가」를 되물어야 하는데, 그 물음의 답은 앱이
 * 무엇을 싸다고 보는지에 달려 있다. 여기에 상수를 베껴 두면 둘이 어긋난다.
 *
 * .ts 를 그대로 부르는 건 노드가 타입을 벗겨 주기 때문이다(22.18+). cost.ts 가
 * 값을 import 하는 순간 깨진다 — 노드는 확장자 없는 상대 경로를 못 찾는다.
 * 지금 cost.ts 의 import 는 타입뿐이고, 앞으로도 그래야 한다.
 */
import { costFor } from '../src/routing/cost.ts';

/* ── 기하 ───────────────────────────────────────────────────────────────── */

const R = 6_371_008.8;
const rad = (d) => (d * Math.PI) / 180;
const M_PER_DEG_LAT = 111_320;

const metersBetween = (a, b) => {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};

const lengthOf = (points) => {
  let total = 0;
  for (let i = 1; i < points.length; i += 1)
    total += metersBetween(points[i - 1], points[i]);
  return total;
};

const round7 = (n) => Math.round(n * 1e7) / 1e7;

/**
 * 선분 a—b 위에서 p 에 가장 가까운 점.
 * 캠퍼스 한 귀퉁이 크기에서는 미터 평면 근사로 충분하다.
 */
const nearestOnSegment = (p, a, b) => {
  const k = M_PER_DEG_LAT * Math.cos(rad(a.lat));
  const px = (p.lng - a.lng) * k;
  const py = (p.lat - a.lat) * M_PER_DEG_LAT;
  const bx = (b.lng - a.lng) * k;
  const by = (b.lat - a.lat) * M_PER_DEG_LAT;

  const span = bx * bx + by * by;
  const t =
    span === 0 ? 0 : Math.max(0, Math.min(1, (px * bx + py * by) / span));
  const at = {
    lat: round7(a.lat + (t * by) / M_PER_DEG_LAT),
    lng: round7(a.lng + (t * bx) / k),
  };
  return { at, t, meters: metersBetween(p, at) };
};

/* ── 그래프 ─────────────────────────────────────────────────────────────── */

/** 간선을 좌표 줄로 편다. [from, ...via, to] */
const spanOf = (edge, nodes) => [
  nodes.get(edge.from),
  ...(edge.via ?? []),
  nodes.get(edge.to),
];

const indexOf = (doc) => {
  const nodes = new Map(doc.nodes.map((node) => [node.id, node]));
  const links = new Map(doc.nodes.map((node) => [node.id, []]));

  for (const edge of doc.edges) {
    if (!nodes.has(edge.from) || !nodes.has(edge.to)) continue;
    const meters = lengthOf(spanOf(edge, nodes));
    links.get(edge.from).push({ edge, to: edge.to, meters });
    links.get(edge.to).push({ edge, to: edge.from, meters });
  }

  return { nodes, links };
};

/** 거리만 보는 다익스트라. 출발점에서 각 노드까지 몇 m 인지. */
const reachFrom = (start, links) => {
  const best = new Map([[start, 0]]);
  const done = new Set();
  const queue = [{ id: start, meters: 0 }];

  while (queue.length) {
    queue.sort((a, z) => a.meters - z.meters);
    const { id, meters } = queue.shift();
    if (done.has(id)) continue;
    done.add(id);

    for (const link of links.get(id) ?? []) {
      const next = meters + link.meters;
      if (next >= (best.get(link.to) ?? Infinity)) continue;
      best.set(link.to, next);
      queue.push({ id: link.to, meters: next });
    }
  }

  return best;
};

/* ── 이어 붙이기 ────────────────────────────────────────────────────────── */

export const MEND_DEFAULTS = {
  /** 이 거리 안에서 벌어진 틈만 메운다(m). */
  limit: 12,
  /** 이 안쪽이면 아예 같은 자리로 친다 — 새 간선 없이 노드를 합친다(m). */
  join: 3,
  /** 돌아가는 길이 이만큼은 줄어야 잇는다(m). */
  gain: 30,
  /** 한 번에 고칠 수 있는 최대 개수. 무한 루프 막이. */
  rounds: 200,
};

/**
 * 막다른 길목 하나를 골라 가장 가까운 길에 붙인다.
 * 고쳤으면 무엇을 고쳤는지 돌려주고, 더 고칠 게 없으면 null.
 */
const mendOne = (doc, options, freshId) => {
  const { nodes, links } = indexOf(doc);

  /*
   * 건물은 원래 한 가닥으로 매달아 둔 것이라 막다른 길목이 맞다. 붙일 대상은
   * 길목(과 출입구)뿐이고, 붙을 상대에서도 건물 접속선은 뺀다 — 접속선은 실제
   * 길이 아니라 건물을 길에 매달아 둔 모형이다.
   */
  const candidates = [];

  for (const node of doc.nodes) {
    if (node.kind !== 'junction' && node.kind !== 'gate') continue;
    const mine = links.get(node.id) ?? [];
    if (mine.length !== 1) continue;

    const own = new Set(mine.map((link) => link.edge.id));
    let best = null;

    for (const edge of doc.edges) {
      if (own.has(edge.id) || edge.connector) continue;
      if (edge.from === node.id || edge.to === node.id) continue;
      if (!nodes.has(edge.from) || !nodes.has(edge.to)) continue;

      const span = spanOf(edge, nodes);
      for (let i = 1; i < span.length; i += 1) {
        const hit = nearestOnSegment(node, span[i - 1], span[i]);
        if (hit.meters > options.limit) continue;
        if (!best || hit.meters < best.gap) {
          best = { edge, segment: i, at: hit.at, gap: hit.meters, span };
        }
      }
    }

    if (best) candidates.push({ node, ...best });
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, z) => a.gap - z.gap);

  /*
   * 지금도 얼추 그 자리까지 걸어갈 수 있으면 잇지 않는다. 예를 들어 계단이
   * 제 아랫도리 차도에서 14m 떨어져 끝나는데 그 차도가 계단 위쪽과 이미 붙어
   * 있으면, 이어 봐야 14m 짜리 곁길만 하나 더 생긴다.
   */
  for (const pick of candidates) {
    const reach = reachFrom(pick.node.id, links);
    const before = Math.min(
      (reach.get(pick.edge.from) ?? Infinity) +
        lengthOf(pick.span.slice(0, pick.segment).concat(pick.at)),
      (reach.get(pick.edge.to) ?? Infinity) +
        lengthOf([pick.at].concat(pick.span.slice(pick.segment))),
    );
    if (before - pick.gap < options.gain) continue;

    return apply(doc, pick, options, freshId, before);
  }

  return null;
};

/**
 * 붙을 자리에 이미 노드가 있으면 그걸 쓰고, 없으면 간선을 쪼개서 만든다.
 *
 * 끝점을 재활용하는 건 새 길목이 하나 덜 생겨서지, 거기까지 이어도 좋다는 뜻이
 * 아니다. 둘은 안 된다.
 *
 *   - 끝점이 집은 자리에 코앞이어도 **막다른 길목에서 보면** limit 밖일 수 있다.
 *     그대로 두면 12m 만 잇겠다고 해 놓고 그보다 긴 선을 긋게 된다.
 *   - 그 끝점과 이미 이어져 있으면 나란한 간선만 하나 더 생긴다.
 *
 * 둘 중 하나라도 걸리면 재활용하지 않고 원래 집은 자리에서 쪼갠다. 새로 찍는
 * 길목은 늘 처음 보는 점이라 이 걱정이 없다.
 */
const landingFor = (doc, pick, options, freshId) => {
  const from = pick.span[0];
  const to = pick.span[pick.span.length - 1];

  const reusable = (end) =>
    metersBetween(pick.at, end) <= options.join &&
    metersBetween(pick.node, end) <= options.limit &&
    !doc.edges.some(
      (edge) =>
        (edge.from === pick.node.id && edge.to === end.id) ||
        (edge.to === pick.node.id && edge.from === end.id),
    );

  if (reusable(from)) return from;
  if (reusable(to)) return to;

  const landing = {
    id: freshId.node(),
    kind: 'junction',
    name: '',
    lat: pick.at.lat,
    lng: pick.at.lng,
    /* 좌표는 OSM 이 그려 둔 선 **위**에서 집은 값이다. */
    precision: 'surveyed',
    note: '끊어져 있던 길을 이으려고 기존 길 위에 새로 찍은 길목.',
  };
  doc.nodes.push(landing);
  splitEdge(doc, pick, landing, freshId);
  return landing;
};

/** 간선을 landing 에서 둘로 가른다. 성격(포장·지름길·출처)은 그대로 물려준다. */
const splitEdge = (doc, pick, landing, freshId) => {
  const { edge, span, segment } = pick;
  const shape = span.slice(1, span.length - 1); // via 만
  const shared = {
    surface: edge.surface,
    shortcut: edge.shortcut,
    covered: edge.covered,
    connector: edge.connector,
    source: edge.source,
  };
  const tail = edge.to;
  const rightVia = shape
    .slice(segment - 1)
    .map((p) => ({ lat: p.lat, lng: p.lng }));
  const leftVia = shape
    .slice(0, segment - 1)
    .map((p) => ({ lat: p.lat, lng: p.lng }));

  const at = doc.edges.indexOf(edge);
  doc.edges[at] = {
    id: edge.id,
    from: edge.from,
    to: landing.id,
    ...shared,
    ...(leftVia.length ? { via: leftVia } : {}),
    ...(edge.note ? { note: edge.note } : {}),
  };
  doc.edges.push({
    id: freshId.edge(),
    from: landing.id,
    to: tail,
    ...shared,
    ...(rightVia.length ? { via: rightVia } : {}),
    ...(edge.note ? { note: edge.note } : {}),
  });
};

/** 고른 한 곳을 실제로 손본다. */
const apply = (doc, pick, options, freshId, before) => {
  const landing = landingFor(doc, pick, options, freshId);
  const gap = metersBetween(pick.node, landing);

  /* 코앞이면 같은 자리로 친다 — 막다른 길목을 붙을 자리에 흡수시킨다. */
  if (gap <= options.join) {
    for (const edge of doc.edges) {
      if (edge.from === pick.node.id) edge.from = landing.id;
      if (edge.to === pick.node.id) edge.to = landing.id;
    }
    /* 배열을 갈아 끼우지 않고 그 자리에서 덜어낸다 — 시드가 같은 배열을 계속 쓴다. */
    for (let i = doc.edges.length - 1; i >= 0; i -= 1) {
      if (doc.edges[i].from === doc.edges[i].to) doc.edges.splice(i, 1);
    }
    doc.nodes.splice(doc.nodes.indexOf(pick.node), 1);
    return {
      kind: 'merge',
      what: `${pick.node.id} 를 ${landing.id} 에 합침`,
      surface: pick.edge.surface,
      gap,
      saved: before - gap,
    };
  }

  doc.edges.push({
    id: freshId.edge(),
    from: pick.node.id,
    to: landing.id,
    surface: 'path',
    shortcut: false,
    covered: false,
    connector: false,
    source: 'assumed',
    note: `OSM 에서 ${Math.round(gap)}m 벌어진 채 끊겨 있던 자리를 이었다.`,
  });

  return {
    kind: 'stitch',
    what: `${pick.node.id} → ${landing.id}`,
    surface: pick.edge.surface,
    gap,
    saved: before - gap,
  };
};

/**
 * 문서 하나를 통째로 손본다. doc 을 직접 고치고, 무엇을 했는지 돌려준다.
 */
export const mendGraph = (doc, overrides = {}) => {
  const options = { ...MEND_DEFAULTS, ...overrides };

  const takenNodes = new Set(doc.nodes.map((node) => node.id));
  const takenEdges = new Set(doc.edges.map((edge) => edge.id));
  let nodeSeq = 0;
  let edgeSeq = 0;
  const freshId = {
    node: () => {
      let id;
      do {
        nodeSeq += 1;
        id = `j${nodeSeq}`;
      } while (takenNodes.has(id));
      takenNodes.add(id);
      return id;
    },
    edge: () => {
      let id;
      do {
        edgeSeq += 1;
        id = `k${edgeSeq}`;
      } while (takenEdges.has(id));
      takenEdges.add(id);
      return id;
    },
  };

  const done = [];
  for (let round = 0; round < options.rounds; round += 1) {
    const fixed = mendOne(doc, options, freshId);
    if (!fixed) break;
    done.push(fixed);
  }

  return done;
};

/* ── 건물을 한 가닥 더 매달기 ───────────────────────────────────────────── */

export const SPUR_DEFAULTS = {
  /** 건물에서 이 거리 안에 있는 길목만 본다(m). */
  reach: 60,
  /** 곧장 가면 이만큼 배 이상 돌아야 매단다. */
  ratio: 3,
  /** 그리고 돌아가는 길이 이만큼은 줄어야 한다(m). */
  gain: 50,
  rounds: 200,
};

/**
 * 건물은 가장 가까운 길목 하나에만 매달려 있다. 그 하나가 건물 **반대편**에
 * 붙으면, 코앞의 길을 두고 블록을 통째로 돌아야 한다.
 *
 * 기초과학실험동이 그랬다. 북쪽 n148 이 34m, 남쪽 n77 이 36m 로 2m 차이인데
 * 가까운 쪽만 잡혔다. 그래서 조형관까지 곧장 119m 를 430m 로 갔다 — 남쪽으로
 * 한 가닥만 더 있으면 계단을 타고 바로 내려가는 길이다.
 *
 * 그래서 **곧장 가면 코앞인데 그래프로는 한참 도는 길목**에 한 가닥을 더 맨다.
 * 시드가 이미 쓰는 접속선과 같은 것이다 — 건물 중심에서 곧게 이은 모형이고,
 * 실제 출입구가 아니다.
 */
export const mendSpurs = (doc, overrides = {}) => {
  const options = { ...SPUR_DEFAULTS, ...overrides };
  const taken = new Set(doc.edges.map((edge) => edge.id));
  let seq = 0;
  const freshId = () => {
    let id;
    do {
      seq += 1;
      id = `s${seq}`;
    } while (taken.has(id));
    taken.add(id);
    return id;
  };

  const done = [];

  for (let round = 0; round < options.rounds; round += 1) {
    const { links } = indexOf(doc);
    let best = null;

    for (const place of doc.nodes) {
      if (place.kind === 'junction') continue;
      const reach = reachFrom(place.id, links);

      for (const node of doc.nodes) {
        if (node.kind !== 'junction') continue;
        const straight = metersBetween(place, node);
        if (straight > options.reach) continue;

        const around = reach.get(node.id) ?? Infinity;
        if (around < straight * options.ratio) continue;
        if (around - straight < options.gain) continue;
        if (!best || around - straight > best.saved) {
          best = { place, node, straight, saved: around - straight };
        }
      }
    }

    if (!best) break;

    doc.edges.push({
      id: freshId(),
      from: best.place.id,
      to: best.node.id,
      surface: 'path',
      shortcut: false,
      covered: false,
      connector: true,
      source: 'assumed',
      note: `건물 중심에서 ${Math.round(best.straight)}m 를 곧게 이었다. 이 길목까지 돌아가던 ${Math.round(best.saved + best.straight)}m 를 덜어낸다.`,
    });
    done.push(best);
  }

  return done;
};

/* ── 계단 어귀에 건물 매달기 ────────────────────────────────────────────── */

export const STAIR_SPUR_DEFAULTS = {
  /** 건물에서 이 거리 안에 있는 계단 어귀만 본다(m). */
  reach: 55,
  /** 지금 그 어귀까지 곧장 가는 거리의 이 배 이상 돌고 있어야 맨다. */
  ratio: 1.6,
  /** 그리고 돌아가는 길이 이만큼은 줄어야 한다(m). */
  gain: 25,
  /** 남의 건물 코앞을 이만큼 안쪽으로 스치는 선은 긋지 않는다(m). */
  clear: 22,
  /** 놓았더니 어디론가 가는 길이 이보다 길어지면 물린다(m). */
  slack: 15,
  rounds: 60,
};

/** 선분 a—b 에서 p 까지 가장 가까운 거리(m). */
const distanceToSegment = (p, a, b) => {
  const k = M_PER_DEG_LAT * Math.cos(rad(a.lat));
  const px = (p.lng - a.lng) * k;
  const py = (p.lat - a.lat) * M_PER_DEG_LAT;
  const bx = (b.lng - a.lng) * k;
  const by = (b.lat - a.lat) * M_PER_DEG_LAT;

  const span = bx * bx + by * by;
  const t =
    span === 0 ? 0 : Math.max(0, Math.min(1, (px * bx + py * by) / span));
  return Math.hypot(px - t * bx, py - t * by);
};

/**
 * 한 곳에서 다른 모든 곳까지, 앱이 고를 길이 몇 m 인지.
 *
 * 비용은 앱과 같게 「최소시간」으로 세고, 재는 것은 그 길의 **거리**다. 우리가
 * 막고 싶은 것이 「빠르다며 더 걷게 만드는 가닥」이기 때문이다. 남의 건물을
 * 관통해 가지 못하는 것도 앱과 같다(src/routing/dijkstra.ts).
 */
const walkFrom = (start, nodes, links) => {
  const options = { profile: 'time', allowIndoor: true };
  const best = new Map([[start, { cost: 0, meters: 0 }]]);
  const done = new Set();
  const queue = [{ id: start, cost: 0 }];

  while (queue.length) {
    queue.sort((a, z) => a.cost - z.cost);
    const { id } = queue.shift();
    if (done.has(id)) continue;
    done.add(id);

    const kind = nodes.get(id)?.kind;
    if (id !== start && (kind === 'building' || kind === 'place')) continue;

    const here = best.get(id);
    for (const link of links.get(id) ?? []) {
      const weight = costFor(link.edge, link.meters, options);
      if (!Number.isFinite(weight)) continue;
      const cost = here.cost + weight;
      if (cost >= (best.get(link.to)?.cost ?? Infinity)) continue;
      best.set(link.to, { cost, meters: here.meters + link.meters });
      queue.push({ id: link.to, cost });
    }
  }

  return best;
};

/** 이름 있는 곳끼리 오가는 길의 거리를 모두 잰다. 「a|b → m」. */
const placePairs = (doc) => {
  const { nodes, links } = indexOf(doc);
  const places = doc.nodes.filter((node) => node.kind !== 'junction');
  const table = new Map();

  for (const from of places) {
    const reach = walkFrom(from.id, nodes, links);
    for (const to of places) {
      if (from.id >= to.id) continue;
      const hit = reach.get(to.id);
      if (hit) table.set(`${from.id}|${to.id}`, hit.meters);
    }
  }

  return table;
};

/** 두 표를 견줘, 가장 크게 길어진 쌍. 없으면 null. */
const walkedFarther = (before, after, slack) => {
  let worst = null;
  for (const [pair, was] of before) {
    const now = after.get(pair);
    if (now === undefined) continue;
    const more = now - was;
    if (more > slack && (!worst || more > worst.more)) {
      worst = { pair, was, now, more };
    }
  }
  return worst;
};

/**
 * 계단으로 가면 코앞인데, 그래프에서는 계단 어귀까지 나가는 길이 없어 도는 곳.
 *
 * 앞 단계(mendSpurs)가 이미 「곧장 가면 코앞인데 한참 도는」 길목에 가닥을
 * 맨다. 다만 문턱이 세서 — 세 배 이상 돌고 50m 넘게 줄어야 한다 — 계단은 그
 * 그물을 자주 빠져나간다. 계단은 짧고, 어귀는 건물에서 30~50m 쯤 떨어져 있고,
 * 돌아가는 길도 두 배 남짓인 자리가 많다. 그래서 계단 어귀만 따로, 더 낮은
 * 문턱으로 한 번 더 훑는다.
 *
 * 없는 길을 지어내지 않으려고 넷을 건다.
 *
 *   1. 가까울 때만   — 건물에서 55m 안의 계단 어귀만 본다.
 *   2. 이득이 클 때만 — 곧장 가는 거리의 1.6배 이상 돌고, 25m 넘게 줄어야 한다.
 *   3. 한 계단에 한 어귀만 — 같은 계단의 양쪽에 다 매달면 그 건물이 계단을
 *      대신하는 승강기가 된다. 실제로는 두 어귀의 높이가 다르다.
 *   4. 남의 건물을 스치지 않게 — 접속선은 건물 **중심**까지 곧게 이은 모형이라,
 *      다른 건물 코앞을 지나는 선은 그 건물을 뚫고 가는 길이 된다.
 *
 * 그러고도 확인할 것이 하나 남는다. 어귀는 높이가 다를 수 있는데 좌표만으로는
 * 알 길이 없다. 어귀를 잘못 잡으면 계단을 타지 않고도 그 자리에 선 것이 되어,
 * 길찾기가 계단 대신 평지로 빙 돌기 시작한다 — **빠르다면서 더 걷는다.** 그래서
 * 가닥을 하나 놓을 때마다 이름 있는 곳끼리의 길을 모두 다시 재서, 15m 넘게
 * 길어지는 데가 하나라도 생기면 그 가닥을 도로 뺀다.
 */
export const mendStairSpurs = (doc, overrides = {}) => {
  const options = { ...STAIR_SPUR_DEFAULTS, ...overrides };
  const taken = new Set(doc.edges.map((edge) => edge.id));
  let seq = 0;
  const freshId = () => {
    let id;
    do {
      seq += 1;
      id = `t${seq}`;
    } while (taken.has(id));
    taken.add(id);
    return id;
  };

  const done = [];
  const refused = [];

  for (let round = 0; round < options.rounds; round += 1) {
    const { nodes, links } = indexOf(doc);
    const stairs = doc.edges.filter((edge) => edge.surface === 'stairs');
    const wanted = [];

    for (const place of doc.nodes) {
      if (place.kind === 'junction') continue;
      const reach = reachFrom(place.id, links);
      const tied = new Set((links.get(place.id) ?? []).map((link) => link.to));

      for (const stair of stairs) {
        for (const id of [stair.from, stair.to]) {
          const node = nodes.get(id);
          if (!node || node.kind !== 'junction' || tied.has(id)) continue;
          /* 같은 계단의 반대쪽 어귀에 이미 매달려 있으면 건너뛴다. */
          if (tied.has(id === stair.from ? stair.to : stair.from)) continue;

          const straight = metersBetween(place, node);
          if (straight > options.reach) continue;
          const around = reach.get(id) ?? Infinity;
          if (around < straight * options.ratio) continue;
          if (around - straight < options.gain) continue;

          const scrapes = doc.nodes.some(
            (other) =>
              other.kind !== 'junction' &&
              other.id !== place.id &&
              distanceToSegment(other, place, node) < options.clear,
          );
          if (scrapes) continue;

          wanted.push({
            place,
            node,
            stair,
            straight,
            saved: around - straight,
          });
        }
      }
    }

    if (wanted.length === 0) break;
    wanted.sort((a, z) => z.saved - a.saved);

    const before = placePairs(doc);
    let placed = null;

    for (const pick of wanted) {
      const edge = {
        id: freshId(),
        from: pick.place.id,
        to: pick.node.id,
        surface: 'path',
        shortcut: false,
        covered: false,
        connector: true,
        source: 'assumed',
        note: `계단 어귀까지 ${Math.round(pick.straight)}m 를 곧게 이었다. 이 어귀까지 돌아가던 ${Math.round(pick.saved + pick.straight)}m 를 덜어낸다.`,
      };
      doc.edges.push(edge);

      const farther = walkedFarther(before, placePairs(doc), options.slack);
      if (farther) {
        doc.edges.pop();
        taken.delete(edge.id);
        refused.push({ ...pick, farther });
        continue;
      }

      placed = pick;
      break;
    }

    if (!placed) break;
    done.push(placed);
  }

  return { done, refused };
};

/** 아직 허공에서 끝나는 곳. 고치고 난 뒤 무엇이 남았는지 보려고. */
export const deadEnds = (doc) => {
  const { links } = indexOf(doc);
  return doc.nodes.filter(
    (node) =>
      (node.kind === 'junction' || node.kind === 'gate') &&
      (links.get(node.id) ?? []).length === 1,
  );
};

/**
 * 아직 한쪽이 뜬 채로 남은 계단.
 *
 * 여기까지 왔는데도 남았다면 규칙으로 메울 자리가 아니다 — 틈이 멀거나(OSM 에
 * 이어질 길 자체가 안 그려져 있다), 학교 밖으로 나가는 계단이거나, 정말로 거기서
 * 끝나는 계단이다. 걸어 보고 확인한 다음 편집 모드에서 이어 주면 된다.
 */
export const looseStairs = (doc) => {
  const { nodes, links } = indexOf(doc);
  const loose = [];

  for (const edge of doc.edges) {
    if (edge.surface !== 'stairs') continue;
    for (const end of [edge.from, edge.to]) {
      if ((links.get(end) ?? []).length !== 1) continue;
      const node = nodes.get(end);
      let near = null;
      for (const place of doc.nodes) {
        if (place.kind === 'junction') continue;
        const meters = metersBetween(node, place);
        if (!near || meters < near.meters) near = { place, meters };
      }
      loose.push({ edge, node, near });
    }
  }

  return loose;
};

/* ── CLI ────────────────────────────────────────────────────────────────── */

const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  const HERE = dirname(fileURLToPath(import.meta.url));
  const FILE = resolve(HERE, '../src/data/campus.json');
  const dry = process.argv.includes('--dry');

  const doc = JSON.parse(readFileSync(FILE, 'utf-8'));
  const before = deadEnds(doc).length;
  const stairsBefore = doc.edges.filter((e) => e.surface === 'stairs').length;

  const done = mendGraph(doc);
  const spurs = mendSpurs(doc);
  const stairSpurs = mendStairSpurs(doc);

  const bySurface = {};
  for (const item of done)
    bySurface[item.surface] = (bySurface[item.surface] ?? 0) + 1;

  console.log(`끊어져 있던 자리 ${done.length}곳을 이었습니다.`);
  for (const item of done) {
    console.log(
      `  ${item.kind === 'merge' ? '합침' : '이음'} ${item.what}` +
        ` — ${item.surface} · 틈 ${item.gap.toFixed(1)}m · 돌아가던 길 ${Math.round(item.saved)}m 를 덜어냄`,
    );
  }
  console.log(
    `  종류별: ${
      Object.entries(bySurface)
        .map(([k, v]) => `${k} ${v}`)
        .join(' · ') || '없음'
    }`,
  );
  console.log(
    `  막다른 길목 ${before}곳 → ${deadEnds(doc).length}곳` +
      ` · 계단 ${stairsBefore}개 → ${doc.edges.filter((e) => e.surface === 'stairs').length}개`,
  );
  console.log(`  노드 ${doc.nodes.length}개 · 간선 ${doc.edges.length}개`);

  if (spurs.length) {
    console.log(`\n건물에 가닥을 ${spurs.length}개 더 맸습니다.`);
    for (const spur of spurs) {
      console.log(
        `  ${spur.place.name} → ${spur.node.id}` +
          ` — 곧장 ${Math.round(spur.straight)}m 인데` +
          ` ${Math.round(spur.saved + spur.straight)}m 를 돌고 있었다`,
      );
    }
  }

  if (stairSpurs.done.length) {
    console.log(`\n계단 어귀에 가닥을 ${stairSpurs.done.length}개 맸습니다.`);
    for (const spur of stairSpurs.done) {
      console.log(
        `  ${spur.place.name} → ${spur.node.id} (계단 ${spur.stair.id})` +
          ` — 곧장 ${Math.round(spur.straight)}m 인데` +
          ` ${Math.round(spur.saved + spur.straight)}m 를 돌고 있었다`,
      );
    }
  }

  /* 한 판에서 물렸다가 다음 판에 놓인 것도 있다. 끝내 안 놓인 것만 센다. */
  const placedStamps = new Set(
    stairSpurs.done.map((spur) => `${spur.place.id}|${spur.node.id}`),
  );
  const refused = [];
  const seenRefusal = new Set();
  for (const spur of stairSpurs.refused) {
    const stamp = `${spur.place.id}|${spur.node.id}`;
    if (placedStamps.has(stamp) || seenRefusal.has(stamp)) continue;
    seenRefusal.add(stamp);
    refused.push(spur);
  }
  if (refused.length) {
    console.log(
      `\n놓았다가 도로 뺀 가닥 ${refused.length}개 — 계단을 대신해 버립니다.`,
    );
    for (const spur of refused) {
      console.log(
        `  ${spur.place.name} → ${spur.node.id} (계단 ${spur.stair.id})` +
          ` — ${spur.farther.pair} 가 ${Math.round(spur.farther.was)}m 에서` +
          ` ${Math.round(spur.farther.now)}m 로 길어진다`,
      );
    }
  }

  const loose = looseStairs(doc);
  if (loose.length) {
    console.log(
      `\n아직 한쪽이 뜬 계단 ${loose.length}개 — 규칙으로 메울 자리가 아닙니다.` +
        '\n걸어 보고 확인한 다음 편집 모드에서 이어 주세요.',
    );
    for (const { edge, node, near } of loose) {
      console.log(
        `  ${edge.id} 끝 ${node.id} (${node.lat}, ${node.lng})` +
          ` — ${near.place.name} 에서 ${Math.round(near.meters)}m`,
      );
    }
  }

  if (dry) {
    console.log('\n--dry 라 파일은 그대로 뒀습니다.');
  } else {
    writeFileSync(FILE, `${JSON.stringify(doc, null, 2)}\n`, 'utf-8');
    console.log(`\n${FILE} 에 썼습니다.`);
  }
}
