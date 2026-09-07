import { useEffect, useRef, useState, type RefObject } from 'react';
import type { CampusNode } from '@/types/campus';
import type { CampusGraph } from '@/routing/graph';
import type { Route } from '@/routing/route';
import {
  PROFILE_LABEL,
  type ProfileId,
  type RouteOptions,
} from '@/routing/cost';
import { Chip, chipTrack, PlaceField, Toggle } from '@/components/common';
import type { Field } from '@/components/PlacePicker';
import type { RouteProgress } from '@/routing/progress';
import { stepAt } from '@/routing/progress';
import type { DirectionStep } from '@/routing/directions';
import { formatDuration, formatMeters } from '@/utils/format';
import type { Upcoming } from '@/timetable/schedule';
import NextClass from './NextClass';
import Progress from './Progress';
import Summary from './Summary';
import Directions from './Directions';
import * as s from './style.css';

/**
 * 폰에서 시트가 어느 자리에 있는지.
 * - expanded  : 다 펼침. 고를 때.
 * - collapsed : 손잡이와 요약 한 줄만. 지도를 볼 때.
 * - hidden    : 화면 밖. 지도에서 곳을 고르는 중.
 */
export type SheetState = 'expanded' | 'collapsed' | 'hidden';

interface Geo {
  active: boolean;
  accuracy: number | null;
  status: string;
  start: () => void;
  stop: () => void;
}

interface Props {
  graph: CampusGraph;
  from: CampusNode | null;
  to: CampusNode | null;
  options: RouteOptions;
  route: Route | null;
  compare: Route | null;
  roadsOnly: Route | null;
  /** 경로를 사람이 읽는 줄로 바꿔 둔 것. 상단 띠와 나눠 쓴다. */
  steps: DirectionStep[];
  indoorCount: number;
  shortcutCount: number;
  geo: Geo;
  editing: boolean;
  /** 걷는 동안의 진행 상황. 위치를 켜지 않았으면 null. */
  progress: RouteProgress | null;
  /** 현위치의 오차 반경(m). 시뮬레이터를 쓰면 가짜 값이 온다. */
  accuracy: number | null;
  simulator: React.ComponentProps<typeof Progress>['simulator'];
  /** 지도가 패널에 가린 만큼을 피해 캠퍼스를 맞추려고 크기를 재 간다. */
  panelRef: RefObject<HTMLElement | null>;
  /** 세로로 든 폰인지. 아래에서 올라오는 시트로 접고 펼 수 있다. */
  phone: boolean;
  /** 가로로 돌린 폰인지. 시트 대신 왼쪽 기둥으로 선다. */
  landscape: boolean;
  sheet: SheetState;
  guiding: boolean;
  onChangeFrom: (node: CampusNode | null) => void;
  onChangeTo: (node: CampusNode | null) => void;
  onSwap: () => void;
  onChangeOptions: (next: RouteOptions) => void;
  onToggleEdit: () => void;
  onSetSheet: (next: SheetState) => void;
  onOpenPicker: (field: Field) => void;
  onStartGuide: () => void;
  onStopGuide: () => void;
  /* ── 시간표 ─────────────────────────────────────────────────────────── */
  /** 아직 시작 안 한 가장 이른 수업. 시간표가 없거나 남은 수업이 없으면 null. */
  upcoming: Upcoming | null;
  /** 그 수업이 열리는 건물. 강의실 번호가 그래프에 없으면 null. */
  upcomingPlace: CampusNode | null;
  hasTimetable: boolean;
  /** 지금 시각. 스스로 갱신되는 값을 받아 '몇 분 뒤' 가 늙지 않게 한다. */
  now: Date;
  onOpenTimetable: () => void;
  onGoToClass: () => void;
}

const GEO_MESSAGE: Record<string, string> = {
  locating: '현위치를 찾는 중입니다',
  coarse: '아직 어림한 자리입니다 — 다듬는 중',
  denied: '위치 권한이 막혀 있습니다',
  unsupported: '이 브라우저는 위치를 못 씁니다',
  failed: '현위치를 못 찾았습니다',
};

/** 이만큼 끌면 접거나 펴는 뜻으로 본다. 그 안쪽은 그냥 누른 것으로 친다. */
const DRAG_SNAP = 24;

const RoutePanel = ({
  graph,
  from,
  to,
  options,
  route,
  compare,
  roadsOnly,
  steps,
  indoorCount,
  shortcutCount,
  geo,
  editing,
  progress,
  accuracy,
  simulator,
  panelRef,
  phone,
  landscape,
  sheet,
  guiding,
  onChangeFrom,
  onChangeTo,
  onSwap,
  onChangeOptions,
  onToggleEdit,
  onSetSheet,
  onOpenPicker,
  onStartGuide,
  onStopGuide,
  upcoming,
  upcomingPlace,
  hasTimetable,
  now,
  onOpenTimetable,
  onGoToClass,
}: Props) => {
  const handleRef = useRef<HTMLDivElement>(null);
  const drag = useRef<number | null>(null);

  const set = <K extends keyof RouteOptions>(key: K, value: RouteOptions[K]) =>
    onChangeOptions({ ...options, [key]: value });

  const unreachable = Boolean(from && to && from.id !== to.id && !route);
  const hasRoute = Boolean(route && route.legs.length > 0);
  const collapsed = phone && sheet === 'collapsed';

  /*
   * 손에 들고 쓰는 화면. 곳은 전체 화면 목록에서 고른다.
   *
   * 세로든 가로든 칸 밑에 여덟 줄 드롭다운을 펼칠 자리가 없다 — 세로는 시트가
   * 좁아서, 가로는 화면이 납작해서. 키보드까지 올라오면 남는 게 없다.
   */
  const handheld = phone || landscape;

  /*
   * 접었을 때 남길 높이.
   *
   * 손잡이 칸을 실제로 재서 쓴다. 숫자를 박아 두면 글꼴이 조금 달라지거나 요약
   * 줄이 두 줄로 접힐 때 바로 어긋난다. 시트 아래 여백(아이폰 홈 바 자리)은
   * env() 라 자바스크립트로 못 읽으니, 붙어 있는 실제 값을 계산된 스타일에서
   * 가져온다.
   */
  const [collapsedHeight, setCollapsedHeight] = useState<number | null>(null);
  useEffect(() => {
    const handle = handleRef.current;
    if (!phone || !handle) {
      setCollapsedHeight(null);
      return;
    }

    const measure = () => {
      const panel = panelRef.current;
      const pad = panel
        ? Number.parseFloat(getComputedStyle(panel).paddingBottom) || 0
        : 0;
      setCollapsedHeight(handle.offsetHeight + pad);
    };
    measure();

    if (typeof ResizeObserver === 'undefined') return;
    const watcher = new ResizeObserver(measure);
    watcher.observe(handle);
    return () => watcher.disconnect();
    /* 요약 줄이 바뀌면 높이도 바뀐다. ResizeObserver 가 안 도는 곳도 있다. */
  }, [phone, panelRef, hasRoute, guiding, unreachable]);

  const toggleSheet = () =>
    onSetSheet(sheet === 'expanded' ? 'collapsed' : 'expanded');

  /* ── 손잡이 끌기 ─────────────────────────────────────────────────────── */

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    /* 시트 안의 단추는 자기 일을 한다. */
    if ((e.target as HTMLElement).closest('[data-sheet-action]')) return;
    drag.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const startY = drag.current;
    drag.current = null;
    if (startY === null) return;

    const moved = e.clientY - startY;
    if (moved > DRAG_SNAP) onSetSheet('collapsed');
    else if (moved < -DRAG_SNAP) onSetSheet('expanded');
    else toggleSheet();
  };

  /* ── 요약 한 줄 ──────────────────────────────────────────────────────── */

  const note = () => {
    if (guiding) return '위로 끌면 안내 목록이 나옵니다';
    if (unreachable) return '이어진 길이 없습니다';
    if (route && route.legs.length === 0) return '출발지와 도착지가 같습니다';
    if (hasRoute) return null;
    if (from || to) return '한 곳만 더 고르면 됩니다';
    return '출발지와 도착지를 고르세요';
  };

  /* 걷는 중에는 전체 길이보다 남은 만큼을 본다. */
  const metric =
    guiding && progress
      ? {
          value: formatDuration(progress.remainingSeconds),
          sub: `${formatMeters(progress.remainingMeters)} 남음`,
        }
      : route && hasRoute
        ? {
            value: formatDuration(route.seconds),
            sub: formatMeters(route.meters),
          }
        : null;

  const following = Boolean(geo.active || simulator);
  const noteText = note();

  return (
    <aside
      className={sheet === 'hidden' ? s.panelHidden : s.panel}
      ref={panelRef}
      style={
        collapsed && collapsedHeight !== null
          ? { maxHeight: `${collapsedHeight}px` }
          : undefined
      }
    >
      {phone && (
        <div
          className={s.handle}
          ref={handleRef}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            drag.current = null;
          }}
        >
          <span className={s.grip} aria-hidden />

          <div className={s.bar}>
            <span className={s.barText}>
              {metric && (
                <span className={s.barMetric}>
                  <span className={s.barValue}>{metric.value}</span>
                  <span className={s.barSub}>{metric.sub}</span>
                </span>
              )}
              {noteText && (
                <span className={unreachable ? s.barWarn : s.barNote}>
                  {noteText}
                </span>
              )}
            </span>

            {hasRoute && (
              <button
                type="button"
                data-sheet-action
                className={guiding ? s.startOn : s.start}
                onClick={guiding ? onStopGuide : onStartGuide}
              >
                {guiding ? '안내 종료' : '안내 시작'}
              </button>
            )}

            <button
              type="button"
              data-sheet-action
              className={s.chevron}
              aria-expanded={sheet === 'expanded'}
              aria-label={sheet === 'expanded' ? '시트 접기' : '시트 펼치기'}
              onClick={toggleSheet}
            >
              {sheet === 'expanded' ? '▼' : '▲'}
            </button>
          </div>
        </div>
      )}

      <div className={s.body}>
        <header className={s.header}>
          <h1 className={s.title}>울산대 캠퍼스 길찾기</h1>
          {/* 설치 단추는 지도 오른쪽 위에 따로 있다 — InstallButton. */}
          <button
            type="button"
            className={hasTimetable ? s.timetableOn : s.edit}
            onClick={onOpenTimetable}
          >
            {/*
              「시간표」 두 글자로는 처음 보는 사람에게 무엇을 하는 단추인지
              알려 주지 않는다. 화면 폭에 따라 말을 바꾸면 같은 단추를 두 이름으로
              부르는 셈이라, 어디서나 같게 쓴다. 제목은 자리가 모자라면 줄여 준다.
            */}
            시간표 넣기
          </button>
          <button
            type="button"
            className={editing ? s.editOn : s.edit}
            onClick={onToggleEdit}
          >
            {editing ? '편집 끄기' : '편집'}
          </button>
        </header>

        {/* 폰에서는 칸을 누르면 전체 화면 목록이 뜬다. */}
        {handheld ? (
          <div className={s.phoneFields}>
            <div className={s.phoneStack}>
              <button
                type="button"
                className={from ? s.pickerFieldSet : s.pickerField}
                onClick={() => onOpenPicker('from')}
              >
                <span className={s.pickerLabel}>출발</span>
                <span className={from ? s.pickerValue : s.pickerEmpty}>
                  {from?.name ?? '어디서 출발하나요'}
                </span>
              </button>
              <button
                type="button"
                className={to ? s.pickerFieldSet : s.pickerField}
                onClick={() => onOpenPicker('to')}
              >
                <span className={s.pickerLabel}>도착</span>
                <span className={to ? s.pickerValue : s.pickerEmpty}>
                  {to?.name ?? '어디로 가나요'}
                </span>
              </button>
            </div>
            <button
              type="button"
              className={s.phoneSwap}
              onClick={onSwap}
              aria-label="출발지와 도착지 바꾸기"
            >
              ⇅
            </button>
          </div>
        ) : (
          <div className={s.fields}>
            <PlaceField
              label="출발"
              places={graph.places}
              value={from}
              onChange={onChangeFrom}
            />
            <button
              type="button"
              className={s.swap}
              onClick={onSwap}
              aria-label="출발지와 도착지 바꾸기"
              title="출발지와 도착지 바꾸기"
            >
              ⇅
            </button>
            <PlaceField
              label="도착"
              places={graph.places}
              value={to}
              onChange={onChangeTo}
            />
          </div>
        )}

        <NextClass
          upcoming={upcoming}
          place={upcomingPlace}
          route={route}
          hasTimetable={hasTimetable}
          now={now}
          onGo={onGoToClass}
        />

        <div className={s.geoRow}>
          <button
            type="button"
            className={geo.active ? s.geoOn : s.geo}
            onClick={geo.active ? geo.stop : geo.start}
          >
            {geo.active ? '현위치 끄기' : '현위치에서 출발'}
          </button>
          {GEO_MESSAGE[geo.status] && (
            <span className={s.geoNote}>{GEO_MESSAGE[geo.status]}</span>
          )}
          {/*
            GPS 는 '여기' 가 아니라 '이 안쪽' 을 알려 준다. 얼마나 어림한
            자리인지 적어 두지 않으면, 건물 안에서 점이 튀는 걸 앱이 고장 난
            것으로 읽는다. 지도에도 같은 반경을 원으로 그려 둔다.
          */}
          {geo.active && accuracy !== null && (
            <span className={s.geoNote} title="GPS 가 알려 준 오차 반경입니다">
              ±{Math.round(accuracy)}m
            </span>
          )}
        </div>

        {/* 접히는 시트가 없는 화면에는 손잡이도 없다. 같은 단추를 여기에 둔다. */}
        {!phone && hasRoute && (
          <div className={s.startRow}>
            <button
              type="button"
              className={guiding ? s.startWideOn : s.startWide}
              onClick={guiding ? onStopGuide : onStartGuide}
            >
              {guiding ? '안내 종료' : '안내 시작 — 현위치를 따라갑니다'}
            </button>
          </div>
        )}

        <div className={s.controls}>
          <div className={chipTrack} role="group" aria-label="경로 기준">
            {(Object.keys(PROFILE_LABEL) as ProfileId[])
              /* 표시된 지름길이 하나도 없으면 그 기준은 아무 일도 안 한다. */
              .filter((id) => id !== 'shortcut' || shortcutCount > 0)
              .map((id) => (
                <Chip
                  key={id}
                  selected={options.profile === id}
                  onClick={() => set('profile', id)}
                  title={
                    id === 'shortcut'
                      ? `캠퍼스 안내도에 칠해 둔 지름길 ${shortcutCount}개를 우대해서 찾습니다`
                      : undefined
                  }
                >
                  {PROFILE_LABEL[id]}
                </Chip>
              ))}
          </div>

          <Toggle
            label="건물 안으로 질러가기"
            hint={
              indoorCount === 0
                ? '아직 등록된 실내 구간이 없습니다 — 편집에서 추가하세요'
                : `등록된 실내 구간 ${indoorCount}개. 문 닫히는 시간엔 꺼 두세요`
            }
            checked={options.allowIndoor}
            disabled={indoorCount === 0}
            onChange={(next) => set('allowIndoor', next)}
          />
        </div>

        <div className={s.result}>
          {route && route.legs.length > 0 && (
            <>
              {following && (
                <Progress
                  progress={progress}
                  step={
                    progress
                      ? steps[
                          stepAt(
                            steps.map((step) => step.meters),
                            progress.along,
                          )
                        ]
                      : null
                  }
                  simulator={simulator}
                  accuracy={accuracy}
                />
              )}
              <Summary route={route} compare={compare} roadsOnly={roadsOnly} />
              <Directions route={route} steps={steps} />
            </>
          )}

          {route && route.legs.length === 0 && (
            <p className={s.empty}>출발지와 도착지가 같습니다.</p>
          )}

          {unreachable && (
            <p className={s.warn}>
              이어진 길이 없습니다. 편집 모드에서 두 곳 사이를 잇는 길을 그려
              주세요.
            </p>
          )}
        </div>
      </div>
    </aside>
  );
};

export default RoutePanel;
