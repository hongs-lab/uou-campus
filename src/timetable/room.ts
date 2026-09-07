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

/** 그 강의실이 있는 건물 노드. 번호가 그래프에 없으면 null. */
export const placeForRoom = (
  graph: CampusGraph,
  room: string,
): CampusNode | null => {
  const no = buildingNoOf(room);
  if (no === null) return null;
  return graph.places.find((place) => place.no === no) ?? null;
};
