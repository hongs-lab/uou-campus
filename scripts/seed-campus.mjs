/**
 * 캠퍼스 그래프 시드 생성기.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 처음에는 캠퍼스 지도 그림의 픽셀을 아핀 변환해 좌표를 만들었습니다. 그런데
 * OpenStreetMap 에 울산대 캠퍼스의 **보행로·계단·건물이 이미 실측으로** 들어가
 * 있어서, 지어낸 근사치를 쓸 이유가 없어졌습니다. 지금은 OSM 원본에서 그래프를
 * 뽑고, 사람이 아는 것(건물 번호·별칭·지름길 여부)만 따로 얹습니다.
 *
 *   node scripts/fetch-osm.mjs      # OSM 원본 받아 두기 (가끔)
 *   node scripts/seed-campus.mjs    # 원본 → src/data/campus.json
 *
 * OSM 에서 온 것 : 길의 형상, 계단, 건물 위치·이름 → precision 'surveyed'
 * 여기서 얹은 것 : 건물 번호, 별칭, 출입구 이름 → 그 부분만 'approx'
 *
 * 지도 데이터 © OpenStreetMap 기여자, ODbL.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { mendGraph } from './mend-graph.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = resolve(HERE, 'osm-campus.json');
const OUT = resolve(HERE, '../src/data/campus.json');

/* ── 사람이 아는 것 ─────────────────────────────────────────────────────
 * 캠퍼스 안내도의 호관 번호와, 학생들이 실제로 부르는 이름.
 * OSM 건물 이름과 붙여 쓴다. 왼쪽이 OSM 이름, 오른쪽이 [번호, 별칭...].
 *
 * 번호는 캠퍼스 공식 안내도의 범례를 그대로 옮긴 값이다. 짐작으로 채우면 안 된다 —
 * 번호가 준공 순서라 이웃한 번호가 캠퍼스 반대편에 있고, 중간에 비는 번호도 있다.
 * 실제로 전기/컴퓨터공학관을 17호관으로 적어 뒀던 적이 있는데, 울산대에 17호관은
 * 없다. 16 다음이 18 이다.
 */

const KNOWN = {
  화학공학관: [1],
  기계항공관: [2, '기항관'],
  공학행정관: [3, '공행관'],
  학생회관별관: [4],
  산학협력리더스홀: [5, '리더스홀'],
  조형관: [6],
  자연과학관: [8, '자과관'],
  해송홀: [9, '대학회관'],
  문수관: [10],
  교수연구동: [11],
  체육관: [12],
  '동아리관 I': [13, '동아리관'],
  '동아리관 II': [31],
  인문관: [14],
  사회과학관: [15, '사과관'],
  아산도서관: [16, '도서관'],
  전기컴퓨터공학관: [7, '전컴관', 'ICT융합학부'],
  제료산업공학관: [18, '재료산업공학관'],
  기초과학실험동: [19],
  시청각교육관: [20],
  학군단: [21, 'ROTC'],
  학생회관: [22],
  건설환경공학관: [23],
  경영관: [24],
  '청운학사 무거관': [25, '기숙사'],
  '청운학사 문수관': [33, '기숙사'],
  행정본관: [26],
  '조선해양공학 수조': [27, '해양공학수조'],
  미술대학: [28, '미대', '예술관'],
  음악대학: [29, '음대', '예술관'],
  공장실험동: [30],
  조소실습동: [32],
  실내식물원: [34, '식물원'],
  구내서점: [36, '서점', '북카페'],
  생활과학관: [37, '생과관'],
  아산스포츠센터: [39],
  '아산도서관 신관': [40, '도서관신관'],
  조선해양공학관: [41, '해양공학관'],
  '조선해양공학 시험동': [42],
  국제관: [43],
  건축관: [44],
  '청운학사 기린관': [45, '기숙사'],
  KCC생활관: [46, 'KCC관'],
  '청운학사 목련관': [38, '기숙사'],
  산학협동관: [35],
  '울산대학교 박물관': [null, '박물관'],
  'KVN 울산 전파천문대': [null, '전파천문대'],
};

/**
 * OSM 쪽 이름이 오타이거나 학생들이 안 쓰는 표기일 때만 바꿔 단다.
 * 좌표는 건드리지 않는다 — 이름표만 고치는 것이다.
 */
const RENAME = {
  제료산업공학관: '재료/산업공학관',
  전기컴퓨터공학관: '전기/컴퓨터공학관',
  '조선해양공학 수조': '해양공학수조',
  구내서점: '서점 및 북카페',
  KCC생활관: 'KCC관',
  실내식물원: '식물원',
  '울산대학교 박물관': '박물관',
};

/*
 * 캠퍼스 경계 안이지만 울산대 건물이 아닌 것들. 남서쪽 울산과학대학교
 * 서부캠퍼스가 경계 안쪽에 물려 있어서 그대로 두면 길찾기 후보에 섞인다.
 */
const NOT_OURS = new Set([
  '1공학관',
  '2공학관',
  '대학회관',
  '용접기술센터',
  '산학협력관',
  'SPF 실험 동물실',
  '수위실',
]);

/* ── 손으로 칠한 지름길 ─────────────────────────────────────────────────
 * 캠퍼스 안내도에 노란색으로 칠해 둔 길.
 *
 * 그림의 픽셀을 위경도로 옮기는 방식은 쓰지 않았습니다. 눈으로 읽은 픽셀은
 * 오차가 수십 미터라 엉뚱한 길에 딱지가 붙습니다. 대신 **노란 선이 지나는 곳을
 * 순서대로** 적어 두고, 실제 보행망 위에서 그 사이를 최단거리로 이어 붙입니다.
 * 그러면 결과가 반드시 실재하는 길에 얹히고, 지어낸 좌표가 하나도 안 생깁니다.
 *
 * 대신 사람이 읽은 것이라 **틀릴 수 있습니다.** 지나는 곳을 촘촘히 적을수록
 * 노란 선을 정확히 따라갑니다. 화면에서 보고 다르면 여기를 고치거나, 편집
 * 모드에서 선을 눌러 지름길을 켜고 끄면 됩니다.
 */
const SHORTCUT_CORRIDORS = [
  {
    name: '기숙사에서 공대로 내려오는 길',
    via: ['청운학사 무거관', '국제관', '건축관'],
  },
  {
    name: '건축관에서 해송홀로 빠지는 길',
    via: ['건축관', '공학행정관', '해송홀'],
  },
  {
    name: '공대 세로축',
    via: ['공학행정관', '화학공학관', '전기/컴퓨터공학관', '문수관'],
  },
  /*
   * 안내도에는 문수관에서 교수연구동(11) 쪽으로 내려가는 노란 선이 하나 더
   * 있습니다. 그런데 교수연구동이 OSM 에 아직 없어서 지날 곳으로 적을 수가
   * 없습니다. 가까운 조형관으로 대신 잡아 봤더니 서쪽으로 70m 쯤 빗나가서
   * (85m 짜리 길이 193m 로 나옴) 아예 빼 뒀습니다.
   * 편집 모드에서 교수연구동을 찍은 뒤 여기에 한 줄 더하면 됩니다.
   */
  {
    name: '정문에서 캠퍼스 안쪽으로',
    via: ['정문', '아산도서관', '행정본관', '문수관'],
  },
];

/**
 * 출입구. OSM 에 문이 노드로 안 찍혀 있어서, 대략의 위치에서 **가장 가까운 실제
 * 길 노드**를 찾아 이름만 붙인다. 좌표는 OSM 것이고 이름표가 추정이다.
 */
const GATE_HINTS = [
  ['정문', 35.5432, 129.2601],
  ['후문', 35.5462, 129.2586],
];

/* ── OSM 태그를 이 앱의 어휘로 ──────────────────────────────────────────── */

const SURFACE_OF = {
  steps: 'stairs',
  footway: 'path',
  path: 'path',
  pedestrian: 'path',
  cycleway: 'path',
  service: 'road',
  residential: 'road',
  unclassified: 'road',
  living_street: 'road',
  track: 'road',
};

const surfaceOf = (tags) => {
  if (tags.indoor === 'yes' || tags.tunnel === 'building_passage')
    return 'indoor';
  return SURFACE_OF[tags.highway] ?? 'path';
};

const coveredOf = (tags) =>
  tags.covered === 'yes' ||
  tags.indoor === 'yes' ||
  tags.tunnel === 'yes' ||
  tags.tunnel === 'building_passage';

/* ── 기하 ───────────────────────────────────────────────────────────────── */

const R = 6_371_008.8;
const rad = (d) => (d * Math.PI) / 180;

const metersBetween = (a, b) => {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};

/** 광선 쏘기. 경계 위 점은 안쪽으로 친다. */
const inside = (point, ring) => {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const a = ring[i];
    const b = ring[j];
    if (
      a.lat > point.lat !== b.lat > point.lat &&
      point.lng <
        ((b.lng - a.lng) * (point.lat - a.lat)) / (b.lat - a.lat) + a.lng
    ) {
      hit = !hit;
    }
  }
  return hit;
};

const round7 = (n) => Math.round(n * 1e7) / 1e7;
const keyOf = (p) => `${round7(p.lat)},${round7(p.lng)}`;

/* ── 원본 읽기 ──────────────────────────────────────────────────────────── */

if (!existsSync(SOURCE)) {
  console.error(
    `${SOURCE} 가 없습니다. 먼저 node scripts/fetch-osm.mjs 를 돌리세요.`,
  );
  process.exit(1);
}

const raw = JSON.parse(readFileSync(SOURCE, 'utf-8'));
const elements = raw.elements;

const boundaryWay = elements.find(
  (e) =>
    e.type === 'way' && e.geometry && !e.tags?.highway && !e.tags?.building,
);
if (!boundaryWay) {
  console.error('캠퍼스 경계를 못 찾았습니다.');
  process.exit(1);
}
const ring = boundaryWay.geometry.map((p) => ({ lat: p.lat, lng: p.lon }));

const highways = elements.filter(
  (e) => e.type === 'way' && e.tags?.highway && e.geometry,
);
const buildings = elements.filter(
  (e) => e.tags?.building && e.tags?.name && (e.center || e.lat),
);

/* ── 1. 캠퍼스 안에 걸치는 길만 남긴다 ──────────────────────────────────── */

const onCampus = highways.filter((way) =>
  way.geometry.some((p) => inside({ lat: p.lat, lng: p.lon }, ring)),
);

/* ── 2. 좌표를 열쇠로 삼아 선분 그래프를 만든다 ─────────────────────────
 * OSM 은 교차점에서 노드를 공유하므로 좌표가 정확히 겹친다. 노드 id 없이도
 * 좌표만으로 같은 점을 알아볼 수 있다.
 */

const points = new Map(); // key → {lat,lng, adj: Set<key>}
const segments = []; // {a, b, tags}

const touch = (p) => {
  const key = keyOf(p);
  if (!points.has(key)) points.set(key, { ...p, adj: new Set() });
  return key;
};

for (const way of onCampus) {
  const coords = way.geometry.map((p) => ({
    lat: round7(p.lat),
    lng: round7(p.lon),
  }));
  for (let i = 1; i < coords.length; i += 1) {
    const a = touch(coords[i - 1]);
    const b = touch(coords[i]);
    if (a === b) continue;
    points.get(a).adj.add(b);
    points.get(b).adj.add(a);
    segments.push({ a, b, tags: way.tags });
  }
}

/* ── 3. 중간에 끼기만 한 점은 접어서 꺾임점(via)으로 만든다 ─────────────
 * 안 그러면 노드가 천 개 넘게 나와서 편집 모드가 못 쓰게 된다.
 */

const segByPair = new Map(
  segments.map((s) => [[s.a, s.b].sort().join('|'), s]),
);
const isCorner = (key) => points.get(key).adj.size === 2;

const sameKind = (t1, t2) =>
  surfaceOf(t1) === surfaceOf(t2) && coveredOf(t1) === coveredOf(t2);

/** 접을 수 있는 점 = 이웃이 딱 둘이고, 양쪽 길의 성격이 같은 곳. */
const collapsible = new Set();
for (const [key, p] of points) {
  if (!isCorner(key)) continue;
  const [x, y] = [...p.adj];
  const s1 = segByPair.get([key, x].sort().join('|'));
  const s2 = segByPair.get([key, y].sort().join('|'));
  if (s1 && s2 && sameKind(s1.tags, s2.tags)) collapsible.add(key);
}

const anchors = [...points.keys()].filter((k) => !collapsible.has(k));

/** anchor 에서 출발해 접히는 점들을 지나 다음 anchor 까지 한 줄로 잇는다. */
const walked = new Set();
const chains = [];

for (const start of anchors) {
  for (const first of points.get(start).adj) {
    const stamp = [start, first].sort().join('|');
    if (walked.has(stamp)) continue;

    const via = [];
    let prev = start;
    let at = first;
    walked.add(stamp);

    while (collapsible.has(at)) {
      via.push(points.get(at));
      const next = [...points.get(at).adj].find((k) => k !== prev);
      if (!next) break;
      walked.add([at, next].sort().join('|'));
      prev = at;
      at = next;
    }

    const seg = segByPair.get([start, first].sort().join('|'));
    if (!seg || start === at) continue;
    chains.push({ from: start, to: at, via, tags: seg.tags });
  }
}

/* ── 4. 노드·간선으로 굳힌다 ────────────────────────────────────────────── */

const used = new Set(chains.flatMap((c) => [c.from, c.to]));
const idOf = new Map();
const nodes = [];

let n = 0;
for (const key of used) {
  n += 1;
  const id = `n${n}`;
  idOf.set(key, id);
  const p = points.get(key);
  nodes.push({
    id,
    kind: 'junction',
    name: '',
    lat: p.lat,
    lng: p.lng,
    precision: 'surveyed',
  });
}

const edges = [];
const pairSeen = new Set();

for (const chain of chains) {
  const from = idOf.get(chain.from);
  const to = idOf.get(chain.to);
  const stamp = [from, to].sort().join('|');
  if (from === to || pairSeen.has(stamp)) continue;
  pairSeen.add(stamp);

  edges.push({
    id: `e${edges.length + 1}`,
    from,
    to,
    surface: surfaceOf(chain.tags),
    shortcut: false,
    covered: coveredOf(chain.tags),
    connector: false,
    source: 'osm',
    ...(chain.via.length
      ? { via: chain.via.map((p) => ({ lat: p.lat, lng: p.lng })) }
      : {}),
  });
}

/* ── 4.5 OSM 이 빠뜨린 이음매 메우기 ────────────────────────────────────
 * OSM 은 계단과 보행로를 따로 그려 놓고 만나는 자리에 점을 안 물려 둔 곳이
 * 많다. 그대로 두면 계단이 허공에서 끝나서 길찾기가 못 탄다. 자세한 규칙은
 * scripts/mend-graph.mjs 에 적어 뒀다.
 */

const mended = mendGraph({ nodes, edges });

/* 여기서부터 간선이 늘었다 — 번호를 배열 길이로 매기면 겹칠 수 있다. */
let edgeSeq = edges.length;
const nextEdgeId = () => {
  edgeSeq += 1;
  return `e${edgeSeq}`;
};

/* ── 5. 건물을 가장 가까운 길에 매단다 ──────────────────────────────────── */

const normalize = (s) => s.replace(/[\s·/]/g, '');
const knownByName = new Map(
  Object.entries(KNOWN).map(([name, v]) => [normalize(name), v]),
);

const nearestJunction = (point, keep = () => true) => {
  let best = null;
  for (const node of nodes) {
    if (node.kind !== 'junction' || !keep(node)) continue;
    const m = metersBetween(point, node);
    if (!best || m < best.m) best = { node, m };
  }
  return best;
};

/** 차도가 물려 있는 노드. 건물을 차도에도 매달아 두려고 미리 모아 둔다. */
const onRoad = new Set(
  edges.filter((e) => e.surface === 'road').flatMap((e) => [e.from, e.to]),
);

/** 건물에서 걸어 나와 길에 붙는 접속선. 실제 출입구가 아니라 모형이다. */
const connect = (buildingId, near, why) => {
  edges.push({
    id: nextEdgeId(),
    from: buildingId,
    to: near.node.id,
    surface: 'path',
    shortcut: false,
    covered: false,
    connector: true,
    source: 'assumed',
    note: `${why} ${Math.round(near.m)}m 를 곧게 이었다`,
  });
};

/** 건물을 차도에까지 매달아 둘 최대 거리. 이보다 멀면 억지다. */
const ROAD_LINK_LIMIT = 120;

const matched = [];
const unmatched = [];
let b = 0;

for (const building of buildings) {
  const at = building.center
    ? { lat: round7(building.center.lat), lng: round7(building.center.lon) }
    : { lat: round7(building.lat), lng: round7(building.lon) };
  if (!inside(at, ring)) continue;

  const osmName = building.tags.name;
  if (NOT_OURS.has(osmName)) continue;
  const name = RENAME[osmName] ?? osmName;
  const known = knownByName.get(normalize(osmName));
  /* 캠퍼스 안이어도 아파트 동 번호 같은 게 섞여 들어온다. 아는 것만 싣는다. */
  if (!known) {
    unmatched.push(osmName);
    continue;
  }

  /* OSM 에 같은 이름의 동이 여럿 잡히는 곳이 있다. 처음 하나만 싣는다. */
  if (matched.includes(osmName)) continue;

  const [no, ...aliases] = known;
  b += 1;
  const id = `b${b}`;
  const node = {
    id,
    kind: 'building',
    name,
    ...(no ? { no } : {}),
    ...(aliases.length ? { aliases } : {}),
    lat: at.lat,
    lng: at.lng,
    /* 좌표는 OSM 실측이지만 건물 **중심**이라 출입구와는 다르다. */
    precision: 'surveyed',
    note: '건물 중심 좌표. 출입구 위치와는 다르다.',
  };

  const near = nearestJunction(at);
  if (!near) continue;
  nodes.push(node);
  connect(id, near, '건물 중심에서 가장 가까운 길까지');

  /*
   * 가장 가까운 길이 보행로뿐이면 그 건물은 차도 쪽에서 영영 안 닿는다.
   * 실제로는 건물에서 걸어 나와 큰길을 탈 수 있으므로 한 가닥 더 매단다.
   */
  if (!onRoad.has(near.node.id)) {
    const road = nearestJunction(at, (n) => onRoad.has(n.id));
    if (road && road.m <= ROAD_LINK_LIMIT) {
      connect(id, road, '건물 중심에서 가장 가까운 차도까지');
    }
  }
  matched.push(osmName);
}

/* ── 6. 출입구는 이름만 얹는다 ──────────────────────────────────────────── */

const gates = [];
for (const [name, lat, lng] of GATE_HINTS) {
  const near = nearestJunction({ lat, lng });
  if (!near) continue;
  near.node.kind = 'gate';
  near.node.name = name;
  near.node.note = `이 자리는 OSM 의 실제 길 노드다. ${name} 이라는 이름표만 추정해 붙였다.`;
  gates.push(`${name} (${Math.round(near.m)}m 안에서 찾음)`);
}

/* ── 6.5 노란 선을 실제 길 위에 얹는다 ──────────────────────────────────
 * 지나는 곳들 사이를 최단거리로 풀어서, 그 위에 놓인 간선에 지름길 딱지를 단다.
 */

const nodeById = new Map(nodes.map((node) => [node.id, node]));

const spanMeters = (edge) => {
  const a = nodeById.get(edge.from);
  const z = nodeById.get(edge.to);
  if (!a || !z) return 0;
  const span = [a, ...(edge.via ?? []), z];
  let meters = 0;
  for (let i = 1; i < span.length; i += 1)
    meters += metersBetween(span[i - 1], span[i]);
  return meters;
};

/*
 * 접속선은 빼고 잇는다. 건물끼리 이으면 경로가 건물 중심으로 끌려 들어가서,
 * 옆을 지나가는 통과 길이 아니라 건물로 들어가는 길에 딱지가 붙는다.
 */
const linksOf = new Map(nodes.map((node) => [node.id, []]));
for (const edge of edges) {
  if (edge.connector) continue;
  if (!nodeById.has(edge.from) || !nodeById.has(edge.to)) continue;
  const meters = spanMeters(edge);
  linksOf.get(edge.from).push({ to: edge.to, edge, meters });
  linksOf.get(edge.to).push({ to: edge.from, edge, meters });
}

/** 지날 곳 이름 → 그 옆에 붙어 있는 실제 길목. 건물 자체가 아니다. */
const waypointOf = new Map();
for (const node of nodes) {
  if (!node.name || waypointOf.has(node.name)) continue;
  if (node.kind === 'junction' || node.kind === 'gate') {
    waypointOf.set(node.name, node.id);
    continue;
  }
  /* 건물이면 그 건물을 매달아 둔 길목을 대신 쓴다. */
  const spur = edges.find(
    (e) => e.connector && (e.from === node.id || e.to === node.id),
  );
  if (spur)
    waypointOf.set(node.name, spur.from === node.id ? spur.to : spur.from);
}
const byName = waypointOf;

/** 거리만 보는 다익스트라. 지나온 간선들을 돌려준다. */
const walk = (from, to) => {
  if (from === to) return [];
  const best = new Map([[from, 0]]);
  const came = new Map();
  const done = new Set();
  const queue = [{ id: from, cost: 0 }];

  while (queue.length) {
    queue.sort((a, z) => a.cost - z.cost);
    const { id, cost } = queue.shift();
    if (done.has(id)) continue;
    done.add(id);
    if (id === to) break;

    for (const link of linksOf.get(id) ?? []) {
      if (done.has(link.to)) continue;
      const next = cost + link.meters;
      if (next >= (best.get(link.to) ?? Infinity)) continue;
      best.set(link.to, next);
      came.set(link.to, { edge: link.edge, from: id });
      queue.push({ id: link.to, cost: next });
    }
  }

  if (!came.has(to)) return null;
  const path = [];
  for (let at = to; at !== from;) {
    const step = came.get(at);
    path.push(step.edge);
    at = step.from;
  }
  return path;
};

const flagged = new Set();
const corridorReport = [];

for (const corridor of SHORTCUT_CORRIDORS) {
  const ids = corridor.via.map((name) => byName.get(name));
  const missing = corridor.via.filter((name, i) => !ids[i]);
  if (missing.length) {
    corridorReport.push(`${corridor.name}: 못 찾은 곳 — ${missing.join(', ')}`);
    continue;
  }

  let meters = 0;
  let broken = false;
  for (let i = 1; i < ids.length; i += 1) {
    const path = walk(ids[i - 1], ids[i]);
    if (!path) {
      corridorReport.push(
        `${corridor.name}: ${corridor.via[i - 1]} → ${corridor.via[i]} 사이가 안 이어짐`,
      );
      broken = true;
      continue;
    }
    for (const edge of path) {
      if (!flagged.has(edge.id)) {
        flagged.add(edge.id);
        edge.shortcut = true;
        edge.note = `캠퍼스 안내도에 노란색으로 칠해진 지름길 — ${corridor.name}`;
      }
    }
    meters += path.reduce((acc, edge) => acc + spanMeters(edge), 0);
  }
  if (!broken) {
    corridorReport.push(`${corridor.name}: ${Math.round(meters)}m`);
  }
}

/* ── 7. 이어지지 않은 조각 걷어내기 ─────────────────────────────────────
 * 캠퍼스 밖으로만 뻗은 길 조각이 남으면 길찾기에서 영영 안 잡힌다.
 * 가장 큰 덩어리만 남긴다.
 */

const adj = new Map(nodes.map((node) => [node.id, []]));
for (const edge of edges) {
  adj.get(edge.from)?.push(edge.to);
  adj.get(edge.to)?.push(edge.from);
}

const componentOf = new Map();
let component = 0;
for (const node of nodes) {
  if (componentOf.has(node.id)) continue;
  component += 1;
  const stack = [node.id];
  componentOf.set(node.id, component);
  while (stack.length) {
    const at = stack.pop();
    for (const next of adj.get(at) ?? []) {
      if (componentOf.has(next)) continue;
      componentOf.set(next, component);
      stack.push(next);
    }
  }
}

const sizes = new Map();
for (const c of componentOf.values()) sizes.set(c, (sizes.get(c) ?? 0) + 1);
const main = [...sizes].sort((a, z) => z[1] - a[1])[0]?.[0];

const keptNodes = nodes.filter((node) => componentOf.get(node.id) === main);
const keptIds = new Set(keptNodes.map((node) => node.id));
const keptEdges = edges.filter((e) => keptIds.has(e.from) && keptIds.has(e.to));

/* ── 8. 쓰기 ────────────────────────────────────────────────────────────── */

const doc = {
  $note:
    '자동 생성 파일. scripts/fetch-osm.mjs 가 받아 둔 OpenStreetMap 원본에서 ' +
    'scripts/seed-campus.mjs 가 뽑았다. 길 형상과 건물 좌표는 OSM 실측이고, ' +
    '건물 번호·별칭·출입구 이름표는 사람이 얹은 값이다. ' +
    '지도 데이터 © OpenStreetMap 기여자, ODbL.',
  generatedBy: 'scripts/seed-campus.mjs',
  osmFetchedAt: raw.fetchedAt,
  osmSource: raw.source,
  nodes: keptNodes,
  edges: keptEdges,
};

if (existsSync(OUT) && !process.argv.includes('--force')) {
  console.error(
    `이미 ${OUT} 가 있습니다. 편집 모드에서 고친 값을 날릴 수 있어 멈춥니다.\n` +
      '정말 다시 만들려면 --force 를 붙이세요.',
  );
  process.exit(1);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(doc, null, 2)}\n`, 'utf-8');

const count = (fn) => keptEdges.filter(fn).length;
console.log(`노드 ${keptNodes.length}개, 간선 ${keptEdges.length}개 → ${OUT}`);
console.log(
  `  건물 ${keptNodes.filter((x) => x.kind === 'building').length}개`,
);
console.log(
  `  계단 ${count((e) => e.surface === 'stairs')}개 · 보행로 ${count((e) => e.surface === 'path')}개 · 차도 ${count((e) => e.surface === 'road')}개`,
);
console.log(`  출입구: ${gates.join(', ') || '못 찾음'}`);
console.log(
  `  이어 붙인 끊어진 자리 ${mended.length}곳` +
    (mended.length
      ? ` (${mended
          .map((x) => `${x.surface} ${x.gap.toFixed(1)}m`)
          .join(' · ')})`
      : ''),
);
console.log(`  지름길 간선 ${keptEdges.filter((e) => e.shortcut).length}개`);
for (const line of corridorReport) console.log(`    ${line}`);
if (nodes.length !== keptNodes.length) {
  console.log(`  이어지지 않아 버린 노드 ${nodes.length - keptNodes.length}개`);
}
const missing = Object.entries(KNOWN)
  .map(([name]) => name)
  .filter((name) => !matched.includes(name));
if (missing.length) {
  console.warn(
    `\n  ⚠ OSM 에 없어서 못 실은 곳 ${missing.length}개:\n    ${missing.join(', ')}`,
  );
}
if (unmatched.length) {
  console.log(
    `\n  참고 — OSM 에 있지만 KNOWN 목록에 없어 뺀 이름 ${unmatched.length}개:\n    ${unmatched.slice(0, 30).join(', ')}`,
  );
}
