import type { Timetable } from '@/types/timetable';

const STORAGE_KEY = 'campus-route:timetable';

/**
 * 시간표는 이 브라우저에만 남는다.
 *
 * 누가 몇 시에 어디 있는지는 남한테 줄 값이 아니다. 서버로 안 보내고, 통계에도
 * 안 싣는다. 기기를 바꾸면 다시 올려야 하는 건 그 대가다.
 */
export const loadTimetable = (): Timetable | null => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved) as Timetable;
    return Array.isArray(parsed.slots) ? parsed : null;
  } catch {
    /* 사생활 보호 모드거나 저장값이 깨졌다. 없는 셈 친다. */
    return null;
  }
};

export const saveTimetable = (timetable: Timetable) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(timetable));
    return true;
  } catch {
    return false;
  }
};

export const clearTimetable = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* 지울 게 없으면 그만이다. */
  }
};
