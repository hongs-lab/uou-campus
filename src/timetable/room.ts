import type { CampusGraph } from '@/routing/graph';
import type { CampusNode } from '@/types/campus';

/**
 * 강의실 코드에서 건물을 찾는다.
 *
 * 울산대 강의실은 `건물번호-호실` 이고, 그 건물 번호가 캠퍼스 안내도 범례의
 * 번호와 같다. 그래프의 노드에도 같은 번호가 붙어 있어서, 시간표와 지도가
 * 이 숫자 하나로 맞물린다.
 */

/**
 * 글자를 읽다 흔히 헷갈리는 것들을 숫자로 되돌린다.
 *
 * 사람이 손으로 칠 때도 그렇지만, 그림에서 읽어 올 때 특히 잦다 — `43-402` 가
 * `43-4O2` 로, `19-509` 가 `l9-509` 로 온다. 여기서 한 번 걸러 주면 확인
 * 화면에서 사람이 고칠 일이 그만큼 준다.
 */
const UNCONFUSE: Record<string, string> = {
  O: '0',
  o: '0',
  D: '0',
  Q: '0',
  l: '1',
  I: '1',
  i: '1',
  '|': '1',
  '!': '1',
  Z: '2',
  z: '2',
  S: '5',
  s: '5',
  b: '6',
  G: '6',
  T: '7',
  B: '8',
  g: '9',
  q: '9',
};

/** 하이픈으로 쓰이는 온갖 줄표를 하나로. 그림에서는 − – — 가 섞여 온다. */
const DASHES = /[-–—−ー－]/g;

export const normalizeRoom = (raw: string): string =>
  raw
    .trim()
    .replace(DASHES, '-')
    .replace(/\s+/g, '')
    .split('')
    .map((ch) => UNCONFUSE[ch] ?? ch)
    .join('')
    .toUpperCase();

/**
 * 강의실 코드처럼 생긴 글자인지.
 *
 * 그림에서 읽어 온 낱말 가운데 되살리기에 넣어 볼 것을 고르는 데 쓴다.
 *
 * **반드시 고르기 전에 `normalizeRoom` 을 거쳐야 한다.** 한때 이 검사가 읽은
 * 원문에 그대로 걸려 있었는데, 그러면 위 헷갈림 표가 통째로 죽는다 — `43-4O2`
 * 도 `l9-509` 도 고쳐지기 전에 버려져서, 고치라고 만든 것들이 한 번도 고쳐지지
 * 않았다. 그래서 정돈을 이 안으로 들여놨다.
 *
 * 정돈을 거친 뒤라 생김새도 단순하다. 온갖 줄표는 이미 `-` 하나로 모였고,
 * 사이의 빈칸도 없어졌고, 글자는 대문자다. 줄표 목록을 두 군데에 두고 어긋나게
 * 둘 일도 이걸로 없다.
 */
const ROOM_LIKE = /^\d{1,2}-?[A-Z]?\d{2,4}$/;

export const looksLikeRoomCode = (raw: string): boolean =>
  ROOM_LIKE.test(normalizeRoom(raw));

/** `7-615` → 7. 건물 번호를 못 읽으면 null. */
export const buildingNoOf = (room: string): number | null => {
  const match = /^(\d{1,2})-/.exec(normalizeRoom(room));
  if (!match) return null;
  const no = Number(match[1]);
  return Number.isFinite(no) && no > 0 ? no : null;
};

/**
 * `7-615` → 6층.
 *
 * 앞의 한두 자리가 층이고 뒤 두 자리가 호실이다. 세 자리가 안 되면 1층으로 본다.
 * 지하(`B1` 꼴)는 층수를 세는 뜻이 달라 그냥 1층으로 두었다 — 어차피 나갈 시각을
 * 어림하는 데만 쓴다.
 */
export const floorOf = (room: string): number => {
  const match = /^\d{1,2}-([A-Z]?)(\d+)/.exec(normalizeRoom(room));
  if (!match || match[1]) return 1;
  const digits = match[2];
  if (digits.length < 3) return 1;
  const floor = Number(digits.slice(0, digits.length - 2));
  return Number.isFinite(floor) && floor > 0 ? floor : 1;
};

/**
 * 호실 번호가 그럴듯한지.
 *
 * 되살리기가 후보를 고를 때 쓴다. `615` 는 6층 15호로 읽히지만 `9509` 는 95층이
 * 되어 버린다. 캠퍼스에 그런 건물은 없다.
 */
const TOP_FLOOR = 25;

const looksLikeRoom = (digits: string): boolean => {
  if (digits.length < 3 || digits.length > 4) return false;
  if (digits.startsWith('0')) return false;
  const floor = Number(digits.slice(0, digits.length - 2));
  return floor >= 1 && floor <= TOP_FLOOR;
};

/**
 * 하이픈이 빠져 붙어 버린 코드를 되살린다.
 *
 * 그림에서 읽어 올 때 `7-615` 가 `7615` 로 오는 일이 있다. 숫자만 보면 어디서
 * 끊어야 할지 알 수 없지만, 두 가지를 안다 — 캠퍼스에 있는 건물 번호와, 호실
 * 번호의 생김새다. `19509` 를 `1-9509` 로 끊으면 95층이 되므로 `19-509` 만
 * 남는다.
 *
 * 후보가 하나로 좁혀질 때만 고친다. 둘 다 그럴듯하면 손대지 않는다 — 잘못
 * 고쳐 놓고 맞다고 우기는 쪽이 더 나쁘다. 그건 확인 화면에서 사람이 정한다.
 */
export const repairRoom = (
  raw: string,
  knownBuildings: Set<number>,
): string => {
  const room = normalizeRoom(raw);
  if (room.includes('-')) return room;

  const digits = /^(\d{3,6})$/.exec(room)?.[1];
  if (!digits) return room;

  const candidates: string[] = [];
  for (const cut of [1, 2]) {
    const rest = digits.slice(cut);
    if (!knownBuildings.has(Number(digits.slice(0, cut)))) continue;
    if (!looksLikeRoom(rest)) continue;
    candidates.push(`${Number(digits.slice(0, cut))}-${rest}`);
  }
  return candidates.length === 1 ? candidates[0] : room;
};

/** 그래프가 아는 건물 번호. 위의 되살리기가 쓴다. */
export const knownBuildingNos = (graph: CampusGraph): Set<number> =>
  new Set(
    graph.places
      .map((p) => p.no)
      .filter((no): no is number => typeof no === 'number'),
  );

/** 그 강의실이 있는 건물 노드. 번호가 그래프에 없으면 null. */
export const placeForRoom = (
  graph: CampusGraph,
  room: string,
): CampusNode | null => {
  const no = buildingNoOf(room);
  if (no === null) return null;
  return graph.places.find((place) => place.no === no) ?? null;
};
