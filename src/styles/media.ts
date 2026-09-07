import screen from './screen';

/*
 * 화면 모양에 이름을 붙여 둔다.
 *
 * 같은 폰이라도 세로로 들었을 때와 가로로 돌렸을 때 남는 자리의 모양이
 * 정반대다. 세로는 위아래가 길어 아래에서 올라오는 시트가 맞고, 가로는
 * 폭이 남고 높이가 모자라 왼쪽에 세우는 기둥이 맞다. 둘은 겹치지 않는다 —
 * 시트는 501px 보다 높을 때만, 기둥은 500px 이하로 납작할 때만 걸린다.
 */

/** 세로로 든 폰. 길찾기 패널이 아래에서 올라오는 시트가 된다. */
export const SHEET =
  `screen and (max-width: ${screen.phone}) and (min-height: ${screen.tall})` as const;

/**
 * 가로로 돌린 폰. 길찾기 패널이 왼쪽에 세우는 기둥이 된다.
 *
 * 폭에도 위를 막아 둔다. 납작하기만 한 것으로는 부족하다 — 데스크톱에서 창을
 * 낮게 눌러 놓은 것까지 여기 걸리면, 마우스로 쓰는 사람에게 전체 화면 목록이
 * 튀어나온다. 가장 큰 폰이 가로로 956px 이고 아이패드는 가로로도 768px 보다
 * 높으니, 태블릿 폭에서 끊으면 손에 드는 화면만 남는다.
 */
export const RAIL =
  `screen and (max-width: ${screen.tablet}) and (max-height: ${screen.short}) and (orientation: landscape)` as const;

/**
 * 손에 들지 않은 화면. 폭도 높이도 남는다.
 *
 * 시트와 기둥의 나머지 전부다 — 시간표처럼 폰에서는 화면을 통째로 덮어야 하는
 * 것이, 여기서는 가운데 카드로 앉아야 한다. 넓은 화면에서 폭을 다 쓰면 글줄이
 * 지나치게 길어지고 단추가 우스꽝스럽게 커진다.
 */
export const WIDE =
  `screen and (min-width: ${screen.wide}) and (min-height: ${screen.tall})` as const;

const media = { SHEET, RAIL, WIDE } as const;

export default media;
