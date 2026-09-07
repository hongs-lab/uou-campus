import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CampusEdge, CampusNode, LatLng } from '@/types/campus';
import {
  DEFAULT_OPTIONS,
  otherProfile,
  type RouteOptions,
} from '@/routing/cost';
import { findRoute, sameRoute } from '@/routing/route';
import { nearestNode } from '@/routing/graph';
import { useCampusDoc } from '@/hooks/useCampusDoc';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useWalkSimulator } from '@/hooks/useWalkSimulator';
import { useLandscape, usePhone } from '@/hooks/useMediaQuery';
import { ARRIVED_METERS, trackProgress } from '@/routing/progress';
import { landmarkNear, toDirections } from '@/routing/directions';
import { useInstall } from '@/hooks/useInstall';
import { useTimetable } from '@/hooks/useTimetable';
import { useNow } from '@/hooks/useNow';
import { nextClass } from '@/timetable/schedule';
import { placeForRoom } from '@/timetable/room';
import { track } from '@/analytics/gtag';
import CampusMap from '@/components/Map';
import RoutePanel, { type SheetState } from '@/components/RoutePanel';
import EditorPanel from '@/components/EditorPanel';
import PlacePicker, { type Field } from '@/components/PlacePicker';
import TopBar from '@/components/TopBar';
import TimetableSheet from '@/components/TimetableSheet';
import InstallButton from '@/components/InstallButton';
import * as s from './App.css';

/** 편집 모드는 주소에 남겨 둔다 — 새로고침해도 하던 일이 이어진다. */
const readEditFlag = () =>
  new URLSearchParams(window.location.search).get('edit') === '1';

/**
 * 위치 시뮬레이터는 `?sim=1` 일 때만 나온다.
 * 걷지 않고도 실시간 위치가 경로를 따라 도는지 확인하려고 두는 것이라,
 * 평소 화면에는 얼씬거리지 않게 한다.
 */
const readSimFlag = () =>
  new URLSearchParams(window.location.search).get('sim') === '1';

/**
 * 지도를 눌러 곳을 고를 때, 누른 자리에서 이만큼 안에 있는 곳만 잡는다.
 *
 * 폰에서 지름 22px 짜리 점을 정확히 맞히라는 건 무리다. 그래서 근처를 대충
 * 눌러도 가장 가까운 곳이 잡히게 한다. 다만 캠퍼스 빈 자리를 눌렀을 때 엉뚱한
 * 건물이 들어오면 더 나쁘니, 너무 멀면 아무 일도 안 한다.
 */
const PICK_LIMIT_METERS = 120;

/** 시뮬레이터가 흔드는 폭에 맞춘 가짜 오차 반경(m). RoutePanel 과 같은 값이다. */
const SIMULATED_ACCURACY = 6;

const App = () => {
  const campus = useCampusDoc();
  const { graph } = campus;

  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);
  const [options, setOptions] = useState<RouteOptions>(DEFAULT_OPTIONS);

  const install = useInstall();
  const [simulating] = useState(readSimFlag);
  const phone = usePhone();
  const landscape = useLandscape();

  /*
   * 손에 들고 쓰는 화면. 곳은 칸 밑 드롭다운이 아니라 전체 화면 목록에서 고른다.
   *
   * 세로로 든 폰은 좁아서, 가로로 돌린 폰은 납작해서 — 이유는 달라도 여덟 줄
   * 드롭다운을 펼칠 자리가 없는 것은 같다. 키보드까지 올라오면 더 그렇다.
   */
  const handheld = phone || landscape;

  /* 지도가 패널에 가린 만큼을 피해 캠퍼스를 맞출 수 있게 패널을 가리켜 둔다. */
  const panelRef = useRef<HTMLElement>(null);

  const [editing, setEditing] = useState(readEditFlag);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [linkFromId, setLinkFromId] = useState<string | null>(null);

  /* ── 화면의 단계 ─────────────────────────────────────────────────────── */

  /**
   * 사람이 손으로 잡아 둔 시트 자리. 어느 구간을 보다가 잡은 것인지까지 같이
   * 들고 있는다 — 안내 목록을 읽으려고 펴 뒀다가 다른 곳을 고르면, 그 손짓은
   * 이미 지난 구간의 것이라 새 구간에는 물려 두지 않는다.
   */
  const [heldSheet, setHeldSheet] = useState<{
    pair: string;
    at: SheetState;
  } | null>(null);
  /** 전체 화면 장소 목록을 띄운 칸. 폰에서만 쓴다. */
  const [picker, setPicker] = useState<Field | null>(null);
  /** 지도에서 직접 고르는 중인 칸. 이때는 시트를 치우고 지도만 남긴다. */
  const [picking, setPicking] = useState<Field | null>(null);
  /** 실시간으로 따라가는 중인지. */
  const [guiding, setGuiding] = useState(false);
  /** 시간표를 넣고 고치는 전체 화면. */
  const [timetableOpen, setTimetableOpen] = useState(false);

  /**
   * 다음에 잡히는 첫 좌표를 출발지로 삼을지.
   *
   * '현위치에서 출발' 을 눌렀을 때만 참이다. 안내를 시작하느라 위치를 켜는
   * 길에도 출발지를 덮어써 버리면, 방금 고른 건물이 소리 없이 사라진다.
   */
  const claimFirstFix = useRef(true);

  /*
   * 현위치가 처음 잡히면 가장 가까운 곳을 출발지로 세운다. 그 뒤로는 안 건드린다.
   *
   * 건물만 골라 붙이면 안 된다. 길 위에 서 있을 때 가장 가까운 건물은 중앙값
   * 44m 나 떨어져 있어서, 열에 일곱은 시작하자마자 '경로에서 벗어남' 으로 잡힌다.
   * 길목까지 포함하면 중앙값 14m 다.
   */
  const geo = useGeolocation({
    onFirstFix: (at) => {
      if (!claimFirstFix.current) return;
      claimFirstFix.current = false;
      const near = nearestNode(graph, at);
      if (near) setFromId(near.node.id);
    },
  });

  /* ── 시간표 ──────────────────────────────────────────────────────────── */

  const timetable = useTimetable();
  /*
   * '다음 수업까지 30분' 은 가만 두면 거짓말이 된다. 시간표가 있을 때만 시계를
   * 돌린다 — 없으면 30초마다 다시 그릴 이유가 없다.
   */
  const now = useNow(timetable.has ? 30_000 : 600_000);

  const upcoming = useMemo(
    () => (timetable.has ? nextClass(timetable.slots, now) : null),
    [timetable.has, timetable.slots, now],
  );

  const upcomingPlace = useMemo(
    () => (upcoming ? placeForRoom(graph, upcoming.slot.room) : null),
    [graph, upcoming],
  );

  /** 다음 수업 건물을 도착지로 세운다. 출발지는 사람이 고른 것을 지킨다. */
  const goToClass = useCallback(() => {
    if (!upcomingPlace) return;
    setToId(upcomingPlace.id);
    track('timetable_route', {
      to: upcomingPlace.name,
      room: upcoming?.slot.room,
    });
  }, [upcoming, upcomingPlace]);

  /* ── 경로 ────────────────────────────────────────────────────────────── */

  const route = useMemo(
    () => (fromId && toId ? findRoute(graph, fromId, toId, options) : null),
    [graph, fromId, toId, options],
  );

  /** 다른 기준으로 잡으면 길이 달라지는지. 같으면 비교를 안 보여 준다. */
  const compare = useMemo(() => {
    if (!fromId || !toId) return null;
    const other: RouteOptions = {
      ...options,
      profile: otherProfile(options.profile),
    };
    const alt = findRoute(graph, fromId, toId, other);
    return sameRoute(route, alt) ? null : alt;
  }, [graph, fromId, toId, options, route]);

  /** 큰길로만 돌았을 때의 기준선. 지름길이 얼마나 아껴 주는지 재려고 쓴다. */
  const roadsOnly = useMemo(
    () =>
      fromId && toId
        ? findRoute(graph, fromId, toId, { ...options, roadsOnly: true })
        : null,
    [graph, fromId, toId, options],
  );

  /*
   * 안내문은 여기서 한 번만 만들어 세 군데가 나눠 쓴다 — 상단 띠, 진행 줄,
   * 안내 목록. 서로 다른 계산을 쓰면 '지금 몇 번째 줄' 이 어긋난다.
   */
  const steps = useMemo(
    () => (route ? toDirections(graph, route) : []),
    [graph, route],
  );

  const indoorCount = useMemo(
    () => campus.doc.edges.filter((e) => e.surface === 'indoor').length,
    [campus.doc.edges],
  );

  const shortcutCount = useMemo(
    () => campus.doc.edges.filter((e) => e.shortcut).length,
    [campus.doc.edges],
  );

  /* ── 시트 자리 ───────────────────────────────────────────────────────── */

  /*
   * 고를 게 남았으면 펼쳐 두고, 두 곳이 다 정해지면 접어서 지도를 내준다.
   * 폰에서 이 앱의 본론은 지도다 — 갈 길이 정해진 뒤에도 시트가 화면 3/4 를
   * 물고 있을 이유가 없다.
   */
  const pair = `${fromId ?? ''}→${toId ?? ''}`;
  const sheet: SheetState = picking
    ? 'hidden'
    : heldSheet?.pair === pair
      ? heldSheet.at
      : fromId && toId
        ? 'collapsed'
        : 'expanded';

  const holdSheet = useCallback(
    (at: SheetState) => setHeldSheet({ pair, at }),
    [pair],
  );

  /* ── 편집 모드 ───────────────────────────────────────────────────────── */

  const toggleEdit = useCallback(() => {
    setEditing((was) => {
      const next = !was;
      const url = new URL(window.location.href);
      if (next) url.searchParams.set('edit', '1');
      else url.searchParams.delete('edit');
      window.history.replaceState(null, '', url);
      if (!next) {
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setLinkFromId(null);
      }
      return next;
    });
  }, []);

  /* ── 곳 고르기 ───────────────────────────────────────────────────────── */

  const assign = useCallback((field: Field, node: CampusNode | null) => {
    if (field === 'from') setFromId(node?.id ?? null);
    else setToId(node?.id ?? null);
  }, []);

  const closePicker = useCallback(() => setPicker(null), []);

  /** 목록에서 골랐다. 반대편이 비어 있으면 이어서 그 칸을 연다. */
  const pickFromList = useCallback(
    (node: CampusNode) => {
      if (!picker) return;
      assign(picker, node);
      track('place_pick', { field: picker, how: 'list', place: node.name });

      const otherEmpty = picker === 'from' ? !toId : !fromId;
      setPicker(otherEmpty ? (picker === 'from' ? 'to' : 'from') : null);
    },
    [assign, picker, fromId, toId],
  );

  /** 지도에서 고르기로 넘어간다. 폰에서는 시트를 화면 밖으로 내린다. */
  const startMapPick = useCallback((field: Field) => {
    setPicker(null);
    setPicking(field);
    track('place_pick_on_map', { field });
  }, []);

  const cancelMapPick = useCallback(() => setPicking(null), []);

  /** '현위치에서 출발'. 다음 첫 좌표를 출발지로 쓰겠다고 표시해 둔다. */
  const useHereAsOrigin = useCallback(() => {
    claimFirstFix.current = true;
    geo.start();
    setPicker(null);
    track('place_pick', { field: 'from', how: 'geo' });
  }, [geo]);

  /* ── 지도에서 오는 손짓 ──────────────────────────────────────────────── */

  const onPickNode = useCallback(
    (node: CampusNode) => {
      if (editing) {
        if (linkFromId) {
          campus.addEdge(linkFromId, node.id);
          setLinkFromId(null);
          return;
        }
        setSelectedNodeId(node.id);
        setSelectedEdgeId(null);
        return;
      }

      if (picking) {
        assign(picking, node);
        setPicking(null);
        track('place_pick', { field: picking, how: 'map', place: node.name });
        return;
      }

      /* 안내 중에 지도를 누르다 출발지가 바뀌면 걷던 길이 사라진다. */
      if (guiding) return;

      /* 길찾기 중이면 출발 → 도착 순으로 채우고, 다 찼으면 이 곳부터 다시. */
      if (!fromId) {
        setFromId(node.id);
        return;
      }
      if (!toId && node.id !== fromId) {
        setToId(node.id);
        return;
      }
      setFromId(node.id);
      setToId(null);
    },
    [campus, editing, linkFromId, picking, guiding, assign, fromId, toId],
  );

  const onMapClick = useCallback(
    (at: LatLng) => {
      if (editing) {
        const node = campus.addNode(at);
        setSelectedNodeId(node.id);
        setSelectedEdgeId(null);
        return;
      }

      if (!picking) return;

      /* 마커를 정확히 못 맞혀도 된다. 누른 자리에서 가장 가까운 곳을 잡는다. */
      const near = nearestNode(graph, at, (node) => node.kind !== 'junction');
      if (!near || near.meters > PICK_LIMIT_METERS) return;

      assign(picking, near.node);
      setPicking(null);
      track('place_pick', {
        field: picking,
        how: 'map_near',
        place: near.node.name,
      });
    },
    [campus, editing, graph, picking, assign],
  );

  const onPickEdge = useCallback((edge: CampusEdge) => {
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
  }, []);

  const swap = useCallback(() => {
    setFromId(toId);
    setToId(fromId);
  }, [fromId, toId]);

  /* 시뮬레이터를 켜면 가짜 위치가 진짜 GPS 자리를 그대로 대신한다. */
  const simulator = useWalkSimulator(
    simulating ? (route?.points ?? null) : null,
  );
  const livePosition = simulating ? simulator.at : geo.here;
  /* 시뮬레이터가 옆으로 흔드는 폭에 맞춘 가짜 오차 반경(m). */
  const liveAccuracy = simulating ? SIMULATED_ACCURACY : geo.accuracy;

  const progress = useMemo(
    () => (route && livePosition ? trackProgress(route, livePosition) : null),
    [route, livePosition],
  );

  /* ── 안내 ────────────────────────────────────────────────────────────── */

  const startGuide = useCallback(() => {
    if (!route) return;
    /* 위치가 없으면 따라갈 게 없다. 다만 출발지는 사람이 고른 것을 지킨다. */
    if (!geo.active && !simulating) {
      claimFirstFix.current = false;
      geo.start();
    }
    setGuiding(true);
    /* 안내를 시작하면 지도가 본론이다. 펴 뒀던 시트는 접어 준다. */
    holdSheet('collapsed');
    track('guide_start', {
      from: route.from.name,
      to: route.to.name,
      meters: Math.round(route.meters),
      profile: options.profile,
    });
  }, [geo, holdSheet, options.profile, route, simulating]);

  const stopGuide = useCallback(() => {
    setGuiding(false);
    track('guide_stop', {
      left_meters: progress ? Math.round(progress.remainingMeters) : undefined,
    });
  }, [progress]);

  const arrived = Boolean(
    guiding && progress && progress.remainingMeters <= ARRIVED_METERS,
  );

  /* 도착은 한 번만 센다. 문 앞에서 위치가 흔들리며 몇 번씩 들락거린다. */
  const arrivalSent = useRef(false);
  useEffect(() => {
    if (!guiding) {
      arrivalSent.current = false;
      return;
    }
    if (!arrived || arrivalSent.current) return;
    arrivalSent.current = true;
    track('guide_arrive', { to: route?.to.name });
  }, [arrived, guiding, route]);

  /* ── 통계 ────────────────────────────────────────────────────────────── */

  /*
   * 어디서 어디로 찾았는지만 남긴다. 좌표나 위치 기록은 보내지 않는다.
   * 같은 구간을 보며 기준만 바꿔 보는 것도 한 번씩 세야 하니 기준까지 넣는다.
   */
  const searchKey = route
    ? `${route.from.id}→${route.to.id}:${options.profile}:${options.allowIndoor}`
    : null;

  useEffect(() => {
    if (!route) return;
    track('route_search', {
      from: route.from.name,
      to: route.to.name,
      profile: options.profile,
      indoor: options.allowIndoor,
      meters: Math.round(route.meters),
      seconds: Math.round(route.seconds),
      shortcut_meters: Math.round(route.shortcutMeters),
    });
    /* 같은 구간을 다시 그릴 때마다 보내지 않는다. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKey]);

  /* 길이 없다고 뜨는 조합은 그래프에 빠진 길이 있다는 뜻이다. 그게 제일 급하다. */
  const fromNode = fromId ? (graph.nodes.get(fromId) ?? null) : null;
  const toNode = toId ? (graph.nodes.get(toId) ?? null) : null;
  const missKey =
    fromNode && toNode && fromNode.id !== toNode.id && !route
      ? `${fromNode.id}→${toNode.id}`
      : null;

  useEffect(() => {
    if (!missKey) return;
    track('route_missing', {
      from: fromNode?.name,
      to: toNode?.name,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missKey]);

  const onInstall = useCallback(() => {
    track('app_install_prompt');
    install.install();
  }, [install]);

  /*
   * 길목에는 이름이 없다. 현위치로 잡힌 자리는 가까운 건물 이름을 빌려 부른다.
   *
   * 기숙사 앞에 서서 현위치를 켰는데 화면에 '현위치 근처' 라고만 떠 있으면, 앱이
   * 나를 제대로 찾은 것인지 알 방법이 없다. 45m 안에 아무것도 없을 때만 그렇게 쓴다.
   */
  const from =
    fromNode && !fromNode.name
      ? {
          ...fromNode,
          name: `${landmarkNear(graph, fromNode) || '현위치'} 근처`,
        }
      : fromNode;

  return (
    <main className={s.screen}>
      <CampusMap
        graph={graph}
        route={route}
        compare={compare}
        fromId={fromId}
        toId={toId}
        here={livePosition}
        accuracy={liveAccuracy}
        progress={progress}
        panelRef={panelRef}
        /* 패널이 어느 쪽을 가리는지. 시트는 아래, 옆에 선 패널·기둥은 왼쪽. */
        panelAt={phone ? 'bottom' : 'left'}
        sheet={sheet}
        follow={guiding}
        picking={picking !== null}
        editing={editing}
        selectedId={selectedEdgeId}
        onPickNode={onPickNode}
        onPickEdge={onPickEdge}
        onMoveNode={campus.moveNode}
        onMapClick={onMapClick}
      />

      <TopBar
        picking={picking}
        guiding={guiding}
        route={route}
        steps={steps}
        progress={progress}
        accuracy={liveAccuracy}
        geoStatus={simulating ? 'ready' : geo.status}
        onCancelPick={cancelMapPick}
        onStopGuide={stopGuide}
      />

      <InstallButton
        mode={install.mode}
        install={onInstall}
        /* 상단 띠가 그 자리를 쓰는 동안에는 비켜 준다. */
        blocked={guiding || picking !== null}
      />

      <RoutePanel
        graph={graph}
        from={from}
        to={toNode}
        options={options}
        route={route}
        compare={compare}
        roadsOnly={roadsOnly}
        steps={steps}
        indoorCount={indoorCount}
        shortcutCount={shortcutCount}
        geo={{ ...geo, start: useHereAsOrigin }}
        editing={editing}
        progress={progress}
        accuracy={liveAccuracy}
        simulator={simulating ? simulator : null}
        panelRef={panelRef}
        phone={phone}
        landscape={landscape}
        sheet={sheet}
        guiding={guiding}
        onChangeFrom={(node) => setFromId(node?.id ?? null)}
        onChangeTo={(node) => setToId(node?.id ?? null)}
        onSwap={swap}
        onChangeOptions={setOptions}
        onToggleEdit={toggleEdit}
        onSetSheet={holdSheet}
        onOpenPicker={setPicker}
        onStartGuide={startGuide}
        onStopGuide={stopGuide}
        upcoming={upcoming}
        upcomingPlace={upcomingPlace}
        hasTimetable={timetable.has}
        now={now}
        onOpenTimetable={() => setTimetableOpen(true)}
        onGoToClass={goToClass}
      />

      {timetableOpen && (
        <TimetableSheet
          graph={graph}
          slots={timetable.slots}
          onSave={timetable.replace}
          onClear={timetable.clear}
          onClose={() => setTimetableOpen(false)}
        />
      )}

      {handheld && picker && (
        <PlacePicker
          field={picker}
          places={graph.places}
          value={picker === 'from' ? from : toNode}
          taken={picker === 'from' ? toNode : from}
          here={livePosition}
          geoStatus={geo.status}
          onPick={pickFromList}
          onUseHere={useHereAsOrigin}
          onPickOnMap={() => startMapPick(picker)}
          onClose={closePicker}
        />
      )}

      {editing && (
        <EditorPanel
          doc={campus.doc}
          dirty={campus.dirty}
          selectedNode={
            selectedNodeId ? (graph.nodes.get(selectedNodeId) ?? null) : null
          }
          selectedEdge={
            selectedEdgeId ? (graph.edges.get(selectedEdgeId) ?? null) : null
          }
          linkFrom={linkFromId ? (graph.nodes.get(linkFromId) ?? null) : null}
          onStartLink={() => setLinkFromId(selectedNodeId)}
          onCancelLink={() => setLinkFromId(null)}
          onUpdateNode={campus.updateNode}
          onRemoveNode={(id) => {
            campus.removeNode(id);
            setSelectedNodeId(null);
          }}
          onUpdateEdge={campus.updateEdge}
          onRemoveEdge={(id) => {
            campus.removeEdge(id);
            setSelectedEdgeId(null);
          }}
          onReset={campus.reset}
          onImport={campus.replace}
        />
      )}
    </main>
  );
};

export default App;
