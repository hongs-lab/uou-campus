import { useCallback, useRef, useState } from 'react';
import type { CampusGraph } from '@/routing/graph';
import type { ClassSlot, Weekday } from '@/types/timetable';
import { WEEKDAY_LABEL } from '@/types/timetable';
import {
  knownBuildingNos,
  normalizeRoom,
  placeForRoom,
} from '@/timetable/room';
import { formatClock } from '@/timetable/schedule';
import * as s from './style.css';

interface Props {
  graph: CampusGraph;
  /** 이미 들고 있는 시간표. 없으면 빈 화면에서 시작한다. */
  slots: ClassSlot[];
  onSave: (slots: ClassSlot[]) => void;
  onClear: () => void;
  onClose: () => void;
}

type Status =
  | { kind: 'idle' }
  | { kind: 'reading'; note: string }
  | { kind: 'failed'; note: string };

let counter = 0;
const newId = () => `slot-${Date.now()}-${(counter += 1)}`;

/** 화면에 세울 순서. 요일이 먼저, 같은 요일이면 이른 시각이 먼저. */
const inOrder = (list: ClassSlot[]) =>
  [...list].sort((a, b) => a.day - b.day || a.startMinutes - b.startMinutes);

/**
 * 시간표를 올리고, 읽은 결과를 확인하는 화면.
 *
 * 그림에서 읽은 값을 곧바로 쓰지 않는다. 글자 인식은 틀린다 — 틀린 강의실로
 * 엉뚱한 건물을 안내하는 것보다, 한 번 보여 주고 고치게 하는 편이 낫다.
 * 못 읽은 칸은 붉게 세워 먼저 눈에 띄게 한다.
 */
const TimetableSheet = ({ graph, slots, onSave, onClear, onClose }: Props) => {
  const [draft, setDraft] = useState<ClassSlot[]>(() => inOrder(slots));
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [warnings, setWarnings] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const patch = useCallback((id: string, change: Partial<ClassSlot>) => {
    setDraft((was) => was.map((x) => (x.id === id ? { ...x, ...change } : x)));
  }, []);

  const remove = useCallback((id: string) => {
    setDraft((was) => was.filter((x) => x.id !== id));
  }, []);

  const addRow = useCallback(() => {
    setDraft((was) => [
      ...was,
      { id: newId(), day: 0, startMinutes: 540, endMinutes: 600, room: '' },
    ]);
  }, []);

  /* ── 그림에서 읽기 ───────────────────────────────────────────────────── */

  const read = useCallback(
    async (file: File) => {
      setWarnings([]);
      setStatus({ kind: 'reading', note: '글자 읽을 준비를 하는 중' });
      try {
        /* 인식기는 여기서 처음 불러온다. 4MB 를 첫 화면에 지울 수는 없다. */
        const { parseTimetableImage } = await import('@/timetable/parseImage');
        const result = await parseTimetableImage(
          file,
          knownBuildingNos(graph),
          (ratio, what) =>
            setStatus({
              kind: 'reading',
              note:
                what === 'recognizing text'
                  ? `글자 읽는 중 ${Math.round(ratio * 100)}%`
                  : '인식기를 내려받는 중',
            }),
        );
        setWarnings(result.warnings);
        setDraft(
          inOrder(
            result.slots.map((x) => ({
              id: newId(),
              day: x.day,
              startMinutes: x.startMinutes,
              endMinutes: x.endMinutes,
              room: x.room,
            })),
          ),
        );
        setStatus({ kind: 'idle' });
      } catch (error) {
        setStatus({
          kind: 'failed',
          note:
            error instanceof Error && error.message
              ? `못 읽었습니다 — ${error.message}`
              : '못 읽었습니다. 다른 그림으로 해 보세요.',
        });
      }
    },
    [graph],
  );

  const unresolved = draft.filter((x) => !placeForRoom(graph, x.room)).length;

  return (
    <div
      className={s.sheet}
      role="dialog"
      aria-modal="true"
      aria-label="시간표"
    >
      <header className={s.head}>
        <h2 className={s.title}>시간표</h2>
        {draft.length > 0 && (
          <button
            type="button"
            className={s.textButton}
            onClick={() => {
              onClear();
              setDraft([]);
              setWarnings([]);
            }}
          >
            지우기
          </button>
        )}
        <button
          type="button"
          className={s.close}
          onClick={onClose}
          aria-label="닫기"
        >
          ×
        </button>
      </header>

      <div className={s.body}>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            /* 같은 파일을 다시 골라도 다시 읽히게 비워 둔다. */
            e.target.value = '';
            if (file) void read(file);
          }}
        />

        <button
          type="button"
          className={s.upload}
          disabled={status.kind === 'reading'}
          onClick={() => fileRef.current?.click()}
        >
          {status.kind === 'reading'
            ? status.note
            : draft.length > 0
              ? '다른 그림으로 다시 읽기'
              : '에브리타임 시간표 그림 올리기'}
        </button>

        <p className={s.hint}>
          에브리타임에서 «시간표 → 이미지 저장» 으로 받은 그림을 올리세요.
          그림은 이 브라우저 안에서만 읽습니다 — 어디로도 올라가지 않습니다.
        </p>

        {status.kind === 'failed' && <p className={s.warn}>{status.note}</p>}
        {warnings.map((note) => (
          <p key={note} className={s.warn}>
            {note}
          </p>
        ))}
        {unresolved > 0 && (
          <p className={s.warn}>
            {unresolved}칸은 강의실을 캠퍼스 건물과 못 맞췄습니다 — 붉은
            칸입니다.「건물번호-호실」 로 고쳐 주세요.
          </p>
        )}

        {draft.length === 0 && status.kind !== 'reading' && (
          <p className={s.empty}>
            아직 시간표가 없습니다. 그림을 올리거나 아래에서 직접 넣으세요.
          </p>
        )}

        <ul className={s.rows}>
          {draft.map((slot) => {
            const place = placeForRoom(graph, slot.room);
            return (
              <li key={slot.id} className={place ? s.row : s.rowBad}>
                <div className={s.rowTop}>
                  <select
                    className={s.day}
                    value={slot.day}
                    aria-label="요일"
                    onChange={(e) =>
                      patch(slot.id, { day: Number(e.target.value) as Weekday })
                    }
                  >
                    {WEEKDAY_LABEL.map((label, i) => (
                      <option key={label} value={i}>
                        {label}
                      </option>
                    ))}
                  </select>

                  <select
                    className={s.hour}
                    value={slot.startMinutes}
                    aria-label="시작 시각"
                    onChange={(e) => {
                      const start = Number(e.target.value);
                      patch(slot.id, {
                        startMinutes: start,
                        endMinutes: Math.max(slot.endMinutes, start + 60),
                      });
                    }}
                  >
                    {Array.from({ length: 15 }, (_, i) => (i + 8) * 60).map(
                      (m) => (
                        <option key={m} value={m}>
                          {formatClock(m)}
                        </option>
                      ),
                    )}
                  </select>
                  <span className={s.dash}>–</span>
                  <select
                    className={s.hour}
                    value={slot.endMinutes}
                    aria-label="끝 시각"
                    onChange={(e) =>
                      patch(slot.id, { endMinutes: Number(e.target.value) })
                    }
                  >
                    {Array.from({ length: 15 }, (_, i) => (i + 9) * 60)
                      .filter((m) => m > slot.startMinutes)
                      .map((m) => (
                        <option key={m} value={m}>
                          {formatClock(m)}
                        </option>
                      ))}
                  </select>

                  <button
                    type="button"
                    className={s.remove}
                    onClick={() => remove(slot.id)}
                    aria-label="이 칸 지우기"
                  >
                    ×
                  </button>
                </div>

                <div className={s.rowBottom}>
                  <input
                    className={s.room}
                    value={slot.room}
                    placeholder="7-615"
                    inputMode="numeric"
                    aria-label="강의실"
                    onChange={(e) =>
                      patch(slot.id, { room: normalizeRoom(e.target.value) })
                    }
                  />
                  <span className={place ? s.place : s.placeBad}>
                    {place ? place.name : '건물을 못 찾음'}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>

        <button type="button" className={s.addRow} onClick={addRow}>
          칸 추가
        </button>
      </div>

      <footer className={s.foot}>
        <button type="button" className={s.cancel} onClick={onClose}>
          취소
        </button>
        <button
          type="button"
          className={s.save}
          disabled={status.kind === 'reading'}
          onClick={() => {
            onSave(inOrder(draft.filter((x) => x.room.trim())));
            onClose();
          }}
        >
          {draft.length}칸 저장
        </button>
      </footer>
    </div>
  );
};

export default TimetableSheet;
