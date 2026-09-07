/**
 * 시간표.
 *
 * 에브리타임에서 내려받은 그림을 읽어 들이거나, 손으로 고쳐 만든다. 브라우저에만
 * 남고 어디로도 올라가지 않는다 — 누가 몇 시에 어디 있는지는 남한테 줄 값이 아니다.
 */

/** 월~금. 캠퍼스 수업은 주말에 없다. */
export type Weekday = 0 | 1 | 2 | 3 | 4;

export const WEEKDAY_LABEL = ['월', '화', '수', '목', '금'] as const;

export interface ClassSlot {
  id: string;
  day: Weekday;
  /** 자정부터 몇 분. 09:00 이면 540. */
  startMinutes: number;
  endMinutes: number;
  /**
   * 강의실. 적힌 그대로 들고 있는다 — 사람이 고칠 때 원문이 보여야 한다.
   * 울산대는 `건물번호-호실` 이라 여기서 건물을 끌어낼 수 있다. 예: `7-615`.
   */
  room: string;
}

export interface Timetable {
  slots: ClassSlot[];
  /** 언제 만든 것인지. 학기가 바뀌었는데 옛 시간표를 붙들고 있지 않도록. */
  savedAt: string;
}
