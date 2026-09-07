import type { CampusNode } from '@/types/campus';
import type { Route } from '@/routing/route';
import type { Upcoming } from '@/timetable/schedule';
import {
  clockOf,
  indoorSeconds,
  leaveBy,
  untilText,
  whenText,
} from '@/timetable/schedule';
import { formatDuration } from '@/utils/format';
import * as s from './style.css';

interface Props {
  /** 시간표가 아예 없으면 null. 그때는 넣으라고만 한다. */
  upcoming: Upcoming | null;
  /** 그 수업이 열리는 건물. 강의실 번호가 그래프에 없으면 null. */
  place: CampusNode | null;
  /** 지금 잡혀 있는 경로. 도착지가 그 건물일 때만 시각을 셈할 수 있다. */
  route: Route | null;
  hasTimetable: boolean;
  now: Date;
  onGo: () => void;
}

/**
 * 다음 수업 한 줄.
 *
 * 시간표를 넣는 이유가 이것 하나다 — 다음에 어디로 가야 하고, 언제 나서야
 * 하는가. 그 답을 내려면 걷는 시간뿐 아니라 건물 안에서 쓰는 시간도 세야 한다.
 * 지도는 건물 중심까지만 데려다주는데 강의실은 6층에 있다.
 */
const NextClass = ({
  upcoming,
  place,
  route,
  hasTimetable,
  now,
  onGo,
}: Props) => {
  /*
   * 시간표가 없으면 아무것도 안 그린다.
   *
   * 넣으라는 단추를 여기 두었더니 넓은 화면에서 패널을 가로지르는 절취선처럼
   * 읽혔다. 하루에 한 번 누를 단추가 길찾기 칸 사이를 갈라 놓을 이유가 없어,
   * 「편집」과 나란히 머리줄로 올렸다.
   */
  if (!hasTimetable) return null;

  if (!upcoming) {
    return (
      <div className={s.classRow}>
        <span className={s.classNote}>남은 수업이 없습니다</span>
      </div>
    );
  }

  const { slot, startsAt } = upcoming;
  /*
   * 건물 이름을 앞세운다.
   *
   * 과목 이름은 시간표에서 안 가져온다 — 인식이 절반쯤밖에 안 맞았고, 걸어가는
   * 사람에게 필요한 것은 과목명이 아니라 어느 건물이냐다. 건물을 못 찾았을
   * 때만 강의실 코드를 대신 세운다.
   */
  const heading = place ? place.name : slot.room;

  /* 도착지가 그 건물로 잡혀 있을 때만 '언제 나가나' 를 말할 수 있다. */
  const aimed = Boolean(place && route && route.to.id === place.id);
  const leave =
    aimed && route ? leaveBy(startsAt, route.seconds, slot.room) : null;
  const late = leave !== null && leave.getTime() < now.getTime();

  return (
    <div className={late ? s.classRowLate : s.classRow}>
      <div className={s.classText}>
        <span className={s.classHead}>
          <span className={s.classWhen}>{whenText(startsAt, now)}</span>
          <span className={s.classTitle}>{heading}</span>
        </span>
        <span className={s.classSub}>
          {clockOf(startsAt)} · {slot.room}
          {place ? '' : ' · 건물을 못 찾음'}
        </span>

        {leave && (
          <span className={late ? s.classLeaveLate : s.classLeave}>
            {late
              ? `${clockOf(leave)} 에 나섰어야 합니다`
              : `${clockOf(leave)} 출발 — ${untilText(leave, now)}`}
            {route && (
              <span className={s.classBreak}>
                {' '}
                걷기 {formatDuration(route.seconds)} · 건물 안{' '}
                {formatDuration(indoorSeconds(slot.room))}
              </span>
            )}
          </span>
        )}
      </div>

      {place && !aimed && (
        <button type="button" className={s.classGo} onClick={onGo}>
          길찾기
        </button>
      )}
    </div>
  );
};

export default NextClass;
