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
  onOpen: () => void;
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
  onOpen,
  onGo,
}: Props) => {
  if (!hasTimetable) {
    return (
      <div className={s.classRow}>
        <button type="button" className={s.classAdd} onClick={onOpen}>
          시간표 넣기
        </button>
      </div>
    );
  }

  if (!upcoming) {
    return (
      <div className={s.classRow}>
        <span className={s.classNote}>남은 수업이 없습니다</span>
        <button type="button" className={s.classEdit} onClick={onOpen}>
          시간표
        </button>
      </div>
    );
  }

  const { slot, startsAt } = upcoming;
  const heading = slot.title || slot.room;

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
          {place ? ` · ${place.name}` : ' · 건물을 못 찾음'}
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
      <button type="button" className={s.classEdit} onClick={onOpen}>
        시간표
      </button>
    </div>
  );
};

export default NextClass;
