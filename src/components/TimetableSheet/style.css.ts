import { style, styleVariants } from '@vanilla-extract/css';
import { elevation, flex, font, layout, media, spacing, theme } from '@/styles';

/*
 * 이 창을 다시 짜면서 버린 것들.
 *
 * 하나, 창을 가로지르는 큰 단추. 폭을 꽉 채운 단추는 「여기 말고는 누를 데가
 * 없다」는 뜻인데 이 창에는 고칠 것이 열 몇 줄이나 있다. 끝내는 단추는 오른쪽
 * 아래에 작게 둔다 — 글을 다 읽고 눈이 마지막으로 닿는 자리다.
 *
 * 둘, 줄마다 두른 테두리. 열한 줄을 다 네모로 싸면 창이 상자 무더기가 된다.
 * 줄은 얇은 선으로만 가르고, 테두리는 손볼 곳에만 남긴다.
 *
 * 셋, 브라우저가 그려 주는 드롭다운. 손대지 않은 회색 화살표 하나가 나머지
 * 공들인 것을 다 무르게 만든다.
 */

/* ── 단추 ─────────────────────────────────────────────────────────────── */

const pressable = style({
  transition: 'background-color 120ms ease, border-color 120ms ease',
  ':disabled': { cursor: 'default' },
  ':active': { transform: 'scale(0.98)' },
  selectors: {
    '&:focus-visible': {
      outline: `2px solid ${theme.accent}`,
      outlineOffset: '2px',
    },
    '&:disabled:active': { transform: 'none' },
  },
});

/** 채운 단추. 이 창에 하나뿐이다 — 다음 걸음이 어디인지 가리키는 것이 일이다. */
const solid = {
  backgroundColor: theme.accent,
  color: theme.onAccent,
  ':hover': { backgroundColor: '#12894A' },
  ':disabled': { backgroundColor: theme.gray[200], color: theme.textTertiary },
} as const;

/** 테두리만. 그만두거나 되돌리는 자리. */
const outline = {
  border: `1px solid ${theme.outline}`,
  backgroundColor: theme.surface,
  color: theme.textSecondary,
  ':hover': { backgroundColor: theme.gray[50], color: theme.textPrimary },
} as const;

/** 바탕도 테두리도 없는 것. 줄 사이에 끼어 있어도 소란스럽지 않다. */
const ghost = {
  color: theme.textSecondary,
  ':hover': { backgroundColor: theme.gray[100], color: theme.textPrimary },
} as const;

const button = {
  /** 창을 끝내는 것. 폭은 글에 맞춘다. */
  primary: {
    height: '44px',
    padding: `0 ${spacing.lg}`,
    borderRadius: layout.radius.md,
  },
  /** 곁들이는 것. */
  secondary: {
    height: '44px',
    padding: `0 ${spacing.md}`,
    borderRadius: layout.radius.md,
  },
  /** 줄 사이를 지나가는 것. */
  tiny: {
    height: '30px',
    padding: `0 10px`,
    borderRadius: layout.radius.sm,
  },
} as const;

/* ── 판 ───────────────────────────────────────────────────────────────── */

export const sheet = style([
  flex.COLUMN_FLEX,
  {
    position: 'fixed',
    inset: 0,
    zIndex: 60,
    backgroundColor: theme.surface,
    paddingTop: 'env(safe-area-inset-top, 0px)',
    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    paddingLeft: 'env(safe-area-inset-left, 0px)',
    paddingRight: 'env(safe-area-inset-right, 0px)',

    '@media': {
      /*
       * 넓은 화면에서는 좁은 카드로 앉는다.
       *
       * 620px 을 쓰다 520px 로 줄였다. 이 창에서 한 줄이 실어 나르는 것은 요일과
       * 시각과 강의실 셋뿐이라, 폭이 남으면 그만큼 허전해진다. 좁게 세운 쪽이
       * 오히려 다부지다.
       */
      [media.WIDE]: {
        top: '50%',
        bottom: 'auto',
        left: '50%',
        right: 'auto',
        transform: 'translate(-50%, -50%)',
        width: 'min(520px, 92vw)',
        maxHeight: '86vh',
        borderRadius: layout.radius.xl,
        boxShadow: elevation.overlay,
        overflow: 'hidden',
      },
    },
  },
]);

/*
 * 머리에는 이름과 닫기만.
 *
 * 가르는 선을 뺐다. 아래 첫 줄과의 사이를 넉넉히 두면 선 없이도 갈린다 —
 * 선 하나를 아끼면 창이 그만큼 트인다.
 */
export const head = style([
  flex.VERTICAL,
  {
    flexShrink: 0,
    gap: spacing.sm,
    padding: `${spacing.lg} ${spacing.md} ${spacing.sm} ${spacing.lg}`,
  },
]);

export const title = style([
  font.appTitle,
  { flex: 1, minWidth: 0, color: theme.textPrimary, letterSpacing: '-0.01em' },
]);

export const close = style([
  pressable,
  flex.CENTER,
  ghost,
  {
    flexShrink: 0,
    width: '36px',
    height: '36px',
    borderRadius: layout.radius.circle,
    fontSize: '20px',
    lineHeight: 1,
  },
]);

export const body = style([
  flex.COLUMN_FLEX,
  {
    flex: 1,
    minHeight: 0,
    gap: spacing.md,
    overflowY: 'auto',
    overscrollBehavior: 'contain',
    WebkitOverflowScrolling: 'touch',
    padding: `0 ${spacing.lg} ${spacing.lg}`,
    '@media': { [media.RAIL]: { padding: `0 ${spacing.md} ${spacing.md}` } },
  },
]);

/* ── 아직 아무것도 없을 때 ────────────────────────────────────────────── */

/**
 * 표가 없을 때는 이 창에서 할 일이 첨부 하나뿐이다.
 *
 * 그러면 화면도 그 하나만 말해야 한다. 가운데로 모으고, 무엇을 가져오면 되는지
 * 시간표 모양 그림으로 보여 준 다음, 단추를 아래 붙인다. 여기서만 폭을 채우지
 * 않는다 — 첨부는 이 화면의 유일한 다음 걸음이라, 크기로 그걸 말해도 거짓이
 * 아니다. 그래도 창을 가로지르지는 않게 두었다.
 */
export const blank = style([
  flex.COLUMN_CENTER,
  {
    gap: spacing.md,
    padding: `${spacing.xl} ${spacing.md}`,
    borderRadius: layout.radius.lg,
    backgroundColor: theme.gray[50],
    textAlign: 'center',
  },
]);

/** 시간표 모양 그림. 무엇을 가져오면 되는지 글보다 빨리 말한다. */
export const glyph = style({
  width: '84px',
  height: '64px',
  flexShrink: 0,
});

export const blankTitle = style([
  font.action,
  { color: theme.textPrimary, letterSpacing: '-0.01em' },
]);

export const hint = style([
  font.body,
  {
    maxWidth: '30ch',
    color: theme.textSecondary,
    wordBreak: 'keep-all',
    lineHeight: 1.65,
  },
]);

/** 설명 가운데 눌러야 할 곳. 에브리타임 안의 차림표 이름이라 그대로 옮긴다. */
export const path = style({
  fontWeight: 600,
  color: theme.textPrimary,
  whiteSpace: 'nowrap',
});

export const attach = style([
  pressable,
  font.bodyStrong,
  button.primary,
  solid,
  { marginTop: spacing.xs },
]);

/* ── 알림 ─────────────────────────────────────────────────────────────── */

/**
 * 알림은 띠가 아니라 한 줄이다.
 *
 * 노란 상자로 두르면 창에서 가장 큰 덩어리가 되어, 정작 고쳐야 할 줄보다
 * 목소리가 커진다. 왼쪽에 색 기둥만 세우고 나머지는 글에 맡긴다.
 */
export const warn = style([
  font.body,
  {
    padding: `${spacing.xs} 0 ${spacing.xs} ${spacing.md}`,
    borderLeft: `3px solid ${theme.warn}`,
    color: theme.warn,
    wordBreak: 'keep-all',
    lineHeight: 1.6,
  },
]);

/* ── 표 ───────────────────────────────────────────────────────────────── */

export const listHead = style([
  flex.BETWEEN,
  { gap: spacing.sm, minHeight: '30px' },
]);

export const listCount = style([
  font.bodyStrong,
  { color: theme.textPrimary, fontVariantNumeric: 'tabular-nums' },
]);

export const listTools = style([flex.VERTICAL, { gap: spacing.xs }]);

export const tool = styleVariants({
  plain: [pressable, font.bodyStrong, button.tiny, ghost],
  danger: [
    pressable,
    font.bodyStrong,
    button.tiny,
    ghost,
    { ':hover': { backgroundColor: theme.errorSoft, color: theme.error } },
  ],
});

/**
 * 줄은 네모로 싸지 않는다. 얇은 선으로만 가른다.
 *
 * 열한 줄을 다 상자로 만들면 창이 상자 무더기가 되고, 그중 어느 상자를 봐야
 * 하는지가 되레 안 보인다. 평평하게 두면 테두리 하나만으로도 「이 줄」이라고
 * 가리킬 수 있다.
 */
export const rows = style([
  flex.COLUMN_FLEX,
  { borderTop: `1px solid ${theme.gray[100]}` },
]);

const rowBase = style([
  flex.COLUMN_FLEX,
  {
    gap: spacing.sm,
    padding: `${spacing.md} 0`,
    borderBottom: `1px solid ${theme.gray[100]}`,
  },
]);

export const row = style([rowBase]);

/**
 * 손볼 줄. 왼쪽에 기둥만 세운다.
 *
 * 바탕까지 노랗게 칠했더니 못 읽은 줄이 잇달아 있을 때 — 흔한 일이다 — 서너
 * 줄이 한 덩어리 노란 판으로 뭉쳐서, 몇 줄이 문제인지가 되레 안 보였다. 그건
 * 강조가 아니라 배경이다. 기둥은 줄마다 끊기므로 세면 세어진다.
 */
export const rowBad = style([
  rowBase,
  {
    position: 'relative',
    selectors: {
      /*
       * 기둥을 테두리로 그리면 줄과 같은 높이라, 손볼 줄이 잇달으면 위아래가
       * 맞닿아 한 줄기로 이어져 버린다. 위아래를 조금씩 떼어 도막으로 세운다 —
       * 그래야 세 줄인지 네 줄인지가 세어진다.
       */
      '&::before': {
        content: '""',
        position: 'absolute',
        left: `-${spacing.sm}`,
        top: '14px',
        bottom: '14px',
        width: '3px',
        borderRadius: '2px',
        backgroundColor: theme.warn,
      },
    },
  },
]);

export const rowTop = style([flex.VERTICAL, { gap: spacing.xs }]);
export const rowBottom = style([flex.VERTICAL, { gap: spacing.sm }]);

/*
 * 드롭다운에서 브라우저 기본 옷을 벗긴다.
 *
 * 손대지 않은 회색 화살표 하나가 나머지 공들인 것을 다 무르게 만든다. 화살표는
 * 직접 그려 넣는다 — 글자색과 같은 회색으로.
 */
const CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236B7280' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")";

const field = style([
  font.body,
  {
    minHeight: '38px',
    padding: `0 10px`,
    borderRadius: layout.radius.sm,
    border: `1px solid ${theme.outline}`,
    backgroundColor: theme.surface,
    color: theme.textPrimary,
    transition: 'border-color 120ms ease, box-shadow 120ms ease',
    selectors: {
      '&:focus-visible': {
        outline: 'none',
        borderColor: theme.accent,
        boxShadow: `0 0 0 3px ${theme.accentSoft}`,
      },
    },
  },
]);

const picker = style([
  field,
  {
    appearance: 'none',
    paddingRight: '26px',
    backgroundImage: CHEVRON,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    cursor: 'pointer',
  },
]);

export const day = style([picker, { flexShrink: 0, width: '62px' }]);
export const hour = style([picker, { flexShrink: 0, width: '88px' }]);
export const dash = style([font.body, { color: theme.gray[300] }]);

export const remove = style([
  pressable,
  flex.CENTER,
  {
    flexShrink: 0,
    marginLeft: 'auto',
    width: '30px',
    height: '30px',
    borderRadius: layout.radius.circle,
    fontSize: '17px',
    lineHeight: 1,
    color: theme.gray[300],
    ':hover': { backgroundColor: theme.errorSoft, color: theme.error },
  },
]);

export const room = style([
  field,
  {
    flexShrink: 0,
    width: '96px',
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '0.02em',
    /*
     * 아직 안 적힌 칸이 적힌 칸처럼 보이면 안 된다. 굵기까지 물려받는 바람에
     * 본보기로 걸어 둔 `7-615` 가 실제로 읽어 낸 값과 구분되지 않았다.
     */
    '::placeholder': {
      fontWeight: 400,
      letterSpacing: 0,
      color: theme.gray[300],
    },
  },
]);

export const place = style([
  font.body,
  { flex: 1, minWidth: 0, color: theme.textSecondary },
]);

export const placeBad = style([
  font.bodyStrong,
  { flex: 1, minWidth: 0, color: theme.warn },
]);

export const addRow = style([
  pressable,
  font.bodyStrong,
  button.tiny,
  ghost,
  { alignSelf: 'flex-start', marginTop: `-${spacing.xs}` },
]);

/* ── 발 ───────────────────────────────────────────────────────────────── */

/**
 * 끝내는 단추는 오른쪽 아래에 모은다.
 *
 * 창을 가로지르는 큰 단추를 쓰다 그만뒀다. 폭을 꽉 채운 단추는 「여기 말고는
 * 누를 데가 없다」는 뜻인데, 이 창에는 그 전에 봐야 할 줄이 열 몇이나 있다.
 * 글을 다 읽고 눈이 마지막으로 닿는 자리에 두는 편이 순서에 맞는다.
 */
export const foot = style([
  flex.END,
  {
    flexShrink: 0,
    gap: spacing.sm,
    padding: `${spacing.md} ${spacing.lg}`,
    borderTop: `1px solid ${theme.gray[100]}`,
    backgroundColor: theme.surface,
  },
]);

export const cancel = style([
  pressable,
  font.bodyStrong,
  button.secondary,
  outline,
]);

export const save = style([pressable, font.bodyStrong, button.primary, solid]);
