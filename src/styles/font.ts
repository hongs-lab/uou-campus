import type { CSSProperties } from '@vanilla-extract/css';

const REM_BASE = 16;

const fontGenerator = (
  weight: number,
  sizePx: number,
  lineHeight: number,
): CSSProperties => ({
  fontWeight: weight,
  fontSize: `${sizePx / REM_BASE}rem`,
  lineHeight: `${lineHeight}%`,
});

const font = {
  appTitle: fontGenerator(700, 20, 130),
  sectionTitle: fontGenerator(700, 15, 140),

  body: fontGenerator(400, 14, 160),
  bodyStrong: fontGenerator(600, 14, 160),

  /**
   * 눈이 먼저 닿아야 하는 짧은 말.
   *
   * 14px 은 표 안에 촘촘히 들어가는 값이라, 창을 열었을 때 무엇을 하는 자리인지
   * 알려 주는 한 줄에는 작다. 제목만큼 크지도 않은 그 사이에 쓴다.
   */
  action: fontGenerator(600, 16, 150),

  label: fontGenerator(600, 13, 130),

  /** 자리수가 흔들리지 않게 고정폭 숫자를 쓴다. */
  metric: {
    ...fontGenerator(700, 22, 120),
    fontVariantNumeric: 'tabular-nums',
  },
  metricSmall: {
    ...fontGenerator(600, 13, 130),
    fontVariantNumeric: 'tabular-nums',
  },

  caption: fontGenerator(500, 12, 145),
} as const;

export default font;
