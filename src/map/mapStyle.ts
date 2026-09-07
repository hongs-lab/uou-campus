import type { PathOptions } from 'leaflet';
import type { CampusEdge } from '@/types/campus';
import { theme } from '@/styles';

/** 캠퍼스가 다 들어오는 처음 화면. */
export const CAMPUS_CENTER = { lat: 35.5442, lng: 129.2566 };
export const CAMPUS_ZOOM = 16;

export const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
/* ODbL 과 타일 사용 정책이 요구하는 최소 표기. 더 줄일 수 없다. */
export const TILE_ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/**
 * 배경으로 깔리는 캠퍼스 보행망.
 *
 * 색을 쓰지 않는다. 예전에는 보행로도 지름길도 경로와 같은 초록이었고, 굵기와
 * 투명도만 달랐다 — 「어느 선을 따라가야 하느냐」가 안 보인다는 말을 들었다.
 * 지도 타일의 공원도 초록이라 삼중으로 겹쳤다.
 *
 * 이제 지도 위에서 초록은 **가야 할 길 하나뿐**이다. 배경은 회색 농담으로만
 * 말한다 — 차도는 뒤로 물리고, 보행로·계단·지름길은 앞세우되 색은 안 준다.
 */
export const baseEdgeStyle = (edge: CampusEdge): PathOptions => {
  if (edge.connector) {
    return {
      color: theme.gray[300],
      weight: 1,
      opacity: 0.5,
      dashArray: '1 4',
      interactive: false,
    };
  }
  /* 아는 사람만 다니는 길. 색 대신 굵기와 진하기로 앞세운다. */
  if (edge.shortcut) {
    return {
      color: theme.gray[700],
      weight: 3.5,
      opacity: 0.62,
      interactive: false,
    };
  }
  switch (edge.surface) {
    case 'stairs':
      return {
        color: theme.gray[500],
        weight: 3,
        opacity: 0.55,
        dashArray: '2 4',
        interactive: false,
      };
    case 'indoor':
      return {
        color: theme.gray[500],
        weight: 3,
        opacity: 0.5,
        dashArray: '1 6',
        interactive: false,
      };
    case 'road':
      return {
        color: theme.gray[400],
        weight: 1.5,
        opacity: 0.28,
        interactive: false,
      };
    default:
      return {
        color: theme.gray[500],
        weight: 2.5,
        opacity: 0.4,
        interactive: false,
      };
  }
};

/**
 * 고른 경로. 지도 위에서 초록은 이것뿐이다.
 *
 * 흰 테를 한 겹 깔아 배경과 떼어 놓는다. 공원처럼 옅은 초록이 깔린 자리를 지날
 * 때, 이 테가 없으면 선이 바닥에 잠긴다.
 */
export const routeCasingStyle: PathOptions = {
  color: theme.gray[0],
  weight: 12,
  opacity: 0.95,
  lineCap: 'round',
  lineJoin: 'round',
  interactive: false,
};

export const routeStyle: PathOptions = {
  color: theme.accent,
  weight: 6,
  opacity: 1,
  lineCap: 'round',
  lineJoin: 'round',
  interactive: false,
};

/** 비교용으로 같이 그리는 두 번째 경로. */
export const compareStyle: PathOptions = {
  color: theme.warn,
  weight: 4,
  opacity: 0.85,
  dashArray: '7 6',
  lineCap: 'round',
  interactive: false,
};

/** 이미 지나온 구간. 남은 길과 헷갈리지 않게 눌러 둔다. */
export const passedStyle: PathOptions = {
  color: theme.gray[400],
  weight: 5,
  opacity: 0.65,
  lineCap: 'round',
  lineJoin: 'round',
  interactive: false,
};

/** 경로 안에서도 지름길 구간만 따로 덧그린다. */
export const shortcutOverlayStyle: PathOptions = {
  color: theme.gray[0],
  weight: 2,
  opacity: 0.9,
  dashArray: '1 7',
  lineCap: 'round',
  interactive: false,
};

/**
 * 현위치의 오차 반경.
 *
 * GPS 는 '여기' 가 아니라 '이 안쪽' 을 알려 준다. 점 하나만 찍어 두면 그 점이
 * 곧 내 자리인 줄 알게 되고, 건물 안에서 30m 씩 튀는 걸 앱이 고장 난 것으로
 * 읽는다. 브라우저가 말해 준 반경을 그대로 그려 둔다.
 */
export const accuracyStyle: PathOptions = {
  color: '#2563EB',
  weight: 1,
  opacity: 0.3,
  fillColor: '#2563EB',
  fillOpacity: 0.07,
  interactive: false,
};
