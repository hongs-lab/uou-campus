import { useCallback, useState } from 'react';
import type { ClassSlot, Timetable } from '@/types/timetable';
import { clearTimetable, loadTimetable, saveTimetable } from '@/data/timetable';

/**
 * 시간표와 그걸 고치는 손잡이들.
 *
 * 그래프(useCampusDoc)와 같은 방식이다 — 상태와 브라우저 저장을 한 번에 옮긴다.
 * 새로고침해도 살아 있고, 지우면 깨끗이 사라진다.
 */
export const useTimetable = () => {
  const [timetable, setTimetable] = useState<Timetable | null>(loadTimetable);

  const replace = useCallback((slots: ClassSlot[]) => {
    const next: Timetable = { slots, savedAt: new Date().toISOString() };
    setTimetable(next);
    saveTimetable(next);
  }, []);

  const clear = useCallback(() => {
    setTimetable(null);
    clearTimetable();
  }, []);

  return {
    timetable,
    slots: timetable?.slots ?? [],
    has: timetable !== null && timetable.slots.length > 0,
    replace,
    clear,
  };
};
