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
   * 읽으라고 내놓은 글과, 누르라고 내놓은 단추.
   *
   * 14px 은 표 안에 촘촘히 들어가는 값이라 설명글이나 큰 단추에는 작다.
   * 한 단계를 더 두어, 사람이 멈춰 서서 읽는 자리에만 쓴다.
   */
  readable: fontGenerator(400, 16, 150),
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
