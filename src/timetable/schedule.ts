import type { ClassSlot, Weekday } from '@/types/timetable';
import { WEEKDAY_LABEL } from '@/types/timetable';
import { floorOf } from './room';

/**
 * '지금 기준으로 다음 수업이 언제 어디냐' 를 셈한다.
 *
 * 시간표는 요일과 시각만 들고 있고 날짜가 없다. 길찾기는 '몇 분 뒤' 를 말해야
 * 하므로, 여기서 다음에 그 수업이 실제로 열리는 순간을 짚어 준다.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** 자바스크립트의 요일(일=0)을 시간표의 요일(월=0)로. 주말이면 null. */
export const weekdayOf = (date: Date): Weekday | null => {
  const day = date.getDay();
  return day >= 1 && day <= 5 ? ((day - 1) as Weekday) : null;
};

/** 그 날의 자정에 분을 얹은 시각. */
const at = (date: Date, minutes: number) => {
  const out = new Date(date);
  out.setHours(0, 0, 0, 0);
  out.setMinutes(minutes);
  return out;
};

export interface Upcoming {
  slot: ClassSlot;
  /** 그 수업이 실제로 시작하는 순간. */
  startsAt: Date;
}

/**
 * 아직 시작하지 않은 수업 중 가장 이른 것.
 *
 * 이레까지 내다본다 — 금요일 저녁에 열면 다음 월요일 첫 수업이 나와야 한다.
 * 지금 듣고 있는 수업은 여기 안 나온다. 그건 `currentClass` 가 따로 말한다.
 */
export const nextClass = (slots: ClassSlot[], now: Date): Upcoming | null => {
  let best: Upcoming | null = null;

  for (let ahead = 0; ahead <= 7; ahead += 1) {
    const date = new Date(now.getTime() + ahead * DAY_MS);
    const day = weekdayOf(date);
    if (day === null) continue;

    for (const slot of slots) {
      if (slot.day !== day) continue;
      const startsAt = at(date, slot.startMinutes);
      if (startsAt <= now) continue;
      if (!best || startsAt < best.startsAt) best = { slot, startsAt };
    }

    /* 그 날에 하나라도 찾았으면 더 볼 것 없다 — 뒷날은 무조건 더 늦다. */
    if (best) break;
  }

  return best;
};

/** 지금 듣고 있는 수업. 없으면 null. */
export const currentClass = (
  slots: ClassSlot[],
  now: Date,
): ClassSlot | null => {
  const day = weekdayOf(now);
  if (day === null) return null;
  const minutes = now.getHours() * 60 + now.getMinutes();
  return (
    slots.find(
      (s) =>
        s.day === day && s.startMinutes <= minutes && minutes < s.endMinutes,
    ) ?? null
  );
};

/**
 * 건물 문 앞에서 강의실까지 걸리는 시간(초).
 *
 * 그래프는 건물 중심까지만 안내한다 — 좌표가 출입구가 아니라 건물 중심이다.
 * 그러니 '몇 시에 나가면 되나' 를 건물 도착 시각으로 답하면 늘 늦는다. 호실
 * 번호가 층을 알려 주므로, 그만큼을 얹어 둔다.
 *
 * 문을 찾아 들어가 복도를 걷는 데 1분, 한 층 오르는 데 25초로 본다. 6층이면
 * 3분 남짓이다. 엘리베이터를 기다리는 시간까지 재기는 어려워 넉넉한 쪽으로 뒀다.
 */
const ENTRY_SECONDS = 60;
const FLOOR_SECONDS = 25;

export const indoorSeconds = (room: string): number =>
  ENTRY_SECONDS + (floorOf(room) - 1) * FLOOR_SECONDS;

/**
 * 늦지 않으려면 언제 나서야 하는지.
 *
 * 걷는 시간과 건물 안에서 쓰는 시간을 수업 시작 시각에서 뺀다. 여기에 더 얹는
 * 여유는 없다 — 없는 여유를 있는 척하면 그게 더 나쁘다.
 */
export const leaveBy = (
  startsAt: Date,
  travelSeconds: number,
  room: string,
): Date =>
  new Date(startsAt.getTime() - (travelSeconds + indoorSeconds(room)) * 1000);

/** `09:00` 꼴로. 시간표와 안내 줄이 같은 모양을 쓴다. */
export const formatClock = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const clockOf = (date: Date): string =>
  formatClock(date.getHours() * 60 + date.getMinutes());

/**
 * 지금부터 그때까지 남은 시간을 사람 말로.
 *
 * 이미 지난 시각이면 '늦었다' 고 말해야 한다 — 음수를 그냥 보여 주면 읽는 사람이
 * 한 번 더 생각해야 한다.
 */
export const untilText = (target: Date, now: Date): string => {
  const minutes = Math.round((target.getTime() - now.getTime()) / 60000);
  if (minutes < 0) return `${-minutes}분 지남`;
  if (minutes === 0) return '지금';
  if (minutes < 60) return `${minutes}분 뒤`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}시간 뒤` : `${h}시간 ${m}분 뒤`;
};

/** 같은 날인지. 자정을 넘겼는지만 보면 된다. */
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/**
 * 언제인지를 한 마디로.
 *
 * 오늘 안의 일이면 '몇 분 뒤' 가 제일 잘 읽힌다. 하지만 금요일 저녁에 열어 놓고
 * '62시간 뒤' 라고 하면 그게 언제인지 아무도 못 센다. 하루를 넘어가면 요일과
 * 시각으로 말한다.
 */
export const whenText = (target: Date, now: Date): string => {
  if (sameDay(target, now)) return untilText(target, now);

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const clock = clockOf(target);
  if (sameDay(target, tomorrow)) return `내일 ${clock}`;

  const day = weekdayOf(target);
  return day === null ? clock : `${WEEKDAY_LABEL[day]} ${clock}`;
};
