import { style, styleVariants } from '@vanilla-extract/css';
import { elevation, flex, font, layout, media, spacing, theme } from '@/styles';

/*
 * 단추의 크기를 세 단계로 둔다.
 *
 * 크기마다 높이와 모서리가 함께 자란다. 같은 곡률로 보이게 하려면 큰 단추일수록
 * 모서리도 커져야 한다 — 52px 짜리에 6px 을 주면 각진 널빤지가 된다.
 *
 *   큼(52) — 이 화면을 끝내는 것. 저장, 그리고 표가 비었을 때의 첨부
 *   중간(46) — 곁들이는 것. 취소, 표가 찼을 때의 다시 읽기
 *   작음(32) — 지나가는 것. 지우기, 칸 추가
 */
const pressable = style({
  transition: 'background-color 120ms ease, border-color 120ms ease',
  ':disabled': { cursor: 'default' },
  /*
   * 눌린 자리를 색이 아니라 크기로 알린다.
   *
   * 색만 바꾸면 손가락에 가려 안 보인다. 살짝 줄어드는 쪽은 손가락 둘레로
   * 드러나서, 가려진 채로도 눌렸다는 것이 보인다.
   */
  ':active': { transform: 'scale(0.985)' },
  selectors: {
    '&:focus-visible': {
      outline: `2px solid ${theme.accent}`,
      outlineOffset: '2px',
    },
    '&:disabled:active': { transform: 'none' },
  },
});

const sizes = {
  large: { minHeight: '52px', borderRadius: layout.radius.lg },
  medium: { minHeight: '46px', borderRadius: layout.radius.lg },
  small: {
    minHeight: '32px',
    padding: `0 ${spacing.sm}`,
    borderRadius: layout.radius.sm,
  },
} as const;

/** 채운 단추. 화면에 하나뿐이어야 한다 — 강조색은 길잡이지 장식이 아니다. */
const fill = {
  backgroundColor: theme.accent,
  color: theme.onAccent,
  ':hover': { backgroundColor: '#128644' },
  ':disabled': { opacity: 0.45 },
} as const;

/** 옅은 단추. 강조색을 쓰되 화면의 주인 자리는 채운 단추에 넘긴다. */
const weak = {
  backgroundColor: theme.accentSoft,
  color: theme.accent,
  ':hover': { backgroundColor: theme.accentTint },
  ':disabled': { opacity: 0.55 },
} as const;

/** 테두리만 있는 단추. 되돌리거나 그만두는 자리. */
const quiet = {
  border: `1px solid ${theme.outline}`,
  backgroundColor: theme.surface,
  color: theme.textSecondary,
  ':hover': { backgroundColor: theme.gray[50], borderColor: theme.gray[300] },
} as const;

/* ── 판 ───────────────────────────────────────────────────────────────── */

/* 장소 고르기(PlacePicker)와 같은 꼴의 전체 화면. 손에 든 화면에서 표를 고치려면 자리가 필요하다. */
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
       * 넓은 화면에서는 화면을 통째로 덮지 않는다.
       *
       * 폰에서야 표를 고치려면 화면이 다 필요하지만, 데스크톱에서 같은 것을
       * 그대로 펼치면 글줄이 지나치게 길어지고 저장 단추가 창을 가로지른다.
       * 가운데 카드로 앉혀 읽을 만한 폭만 쓴다 — 지도 위에 뜨는 다른 패널들과
       * 같은 꼴이다.
       */
      [media.WIDE]: {
        /*
         * 위아래를 다 붙들지 않고 내용만큼만 선다.
         *
         * 5vh~95vh 로 붙들어 두었더니 표가 비었을 때 판의 절반이 빈 흰 바닥이
         * 됐다 — 첨부 단추와 저장 단추 사이가 한 화면쯤 벌어져서, 둘이 같은
         * 창에 있다는 느낌이 사라진다. 아래를 놓고 최대 높이만 정해 두면,
         * 짧으면 짧은 대로 서고 길면 그때 안에서 구른다.
         */
        top: '50%',
        bottom: 'auto',
        left: '50%',
        right: 'auto',
        transform: 'translate(-50%, -50%)',
        width: 'min(620px, 92vw)',
        maxHeight: '88vh',
        borderRadius: layout.radius.xl,
        border: `1px solid ${theme.outline}`,
        boxShadow: elevation.overlay,
        overflow: 'hidden',
      },
    },
  },
]);

/*
 * 머리에는 이름만 둔다.
 *
 * 「지우기」를 제목 옆에 두었더니, 창을 열자마자 눈에 드는 셋 가운데 하나가
 * 표를 없애는 단추였다. 여기 온 사람이 하려는 일은 그게 아니다. 지우기는
 * 표가 실제로 있을 때 그 표 바로 위로 내렸다.
 */
export const head = style([
  flex.VERTICAL,
  {
    flexShrink: 0,
    gap: spacing.sm,
    padding: `${spacing.md} ${spacing.sm} ${spacing.md} ${spacing.lg}`,
    borderBottom: `1px solid ${theme.outline}`,
    '@media': {
      [media.RAIL]: { padding: `${spacing.sm} ${spacing.sm}` },
    },
  },
]);

export const title = style([
  font.appTitle,
  { flex: 1, minWidth: 0, color: theme.textPrimary },
]);

export const close = style([
  pressable,
  flex.CENTER,
  {
    flexShrink: 0,
    width: '40px',
    height: '40px',
    borderRadius: layout.radius.circle,
    fontSize: '22px',
    lineHeight: 1,
    color: theme.textSecondary,
    ':hover': { backgroundColor: theme.gray[100], color: theme.textPrimary },
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
    padding: spacing.lg,
    '@media': { [media.RAIL]: { padding: spacing.md } },
  },
]);

/* ── 첨부 ─────────────────────────────────────────────────────────────── */

/**
 * 첨부 단추는 표가 있느냐에 따라 무게가 바뀐다.
 *
 * 표가 비었으면 이 화면에서 할 일은 첨부뿐이다 — 채운 단추로 세운다. 표가
 * 차고 나면 할 일은 저장으로 넘어가고, 다시 읽기는 곁가지가 된다 — 옅은
 * 단추로 물러선다. 채운 단추가 한 화면에 둘이면 어느 쪽을 눌러야 할지
 * 알려 주는 힘을 서로 깎아먹는다.
 *
 * 점선 테두리는 뗐다. 점선은 「여기로 끌어다 놓으라」는 뜻인데 이건 그런
 * 자리가 아니어서, 없는 약속을 그려 보이고 있었다.
 */
export const upload = styleVariants({
  strong: [pressable, font.action, sizes.large, fill, { width: '100%' }],
  weak: [pressable, font.action, sizes.medium, weak, { width: '100%' }],
});

export const hint = style([
  font.readable,
  { color: theme.textSecondary, wordBreak: 'keep-all' },
]);

/** 설명 가운데 눌러야 할 곳. 에브리타임 안의 차림표 이름이라 그대로 옮긴다. */
export const path = style({
  fontWeight: 600,
  color: theme.textPrimary,
  whiteSpace: 'nowrap',
});

/* ── 알림 ─────────────────────────────────────────────────────────────── */

export const warn = style([
  font.body,
  {
    padding: `${spacing.sm} ${spacing.md}`,
    borderRadius: layout.radius.md,
    backgroundColor: theme.warnSoft,
    color: theme.warn,
    wordBreak: 'keep-all',
  },
]);

export const empty = style([
  flex.COLUMN_CENTER,
  font.readable,
  {
    gap: spacing.xs,
    padding: `${spacing.xl} 0`,
    borderRadius: layout.radius.lg,
    border: `1px solid ${theme.outline}`,
    color: theme.textTertiary,
    textAlign: 'center',
  },
]);

/* ── 표 ───────────────────────────────────────────────────────────────── */

export const listHead = style([
  flex.BETWEEN,
  { gap: spacing.sm, marginBottom: `-${spacing.sm}` },
]);

export const listCount = style([font.bodyStrong, { color: theme.textPrimary }]);

export const textButton = style([
  pressable,
  font.bodyStrong,
  sizes.small,
  quiet,
  { flexShrink: 0, ':hover': { color: theme.warn, borderColor: theme.warn } },
]);

export const rows = style([flex.COLUMN_FLEX, { gap: spacing.sm }]);

const rowBase = style([
  flex.COLUMN_FLEX,
  {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: layout.radius.lg,
    border: `1px solid ${theme.outline}`,
    backgroundColor: theme.surface,
  },
]);

export const row = style([rowBase]);

/** 강의실이 캠퍼스 건물과 안 맞는 칸. 먼저 눈에 띄어야 고친다. */
export const rowBad = style([
  rowBase,
  { borderColor: theme.warn, backgroundColor: theme.warnSoft },
]);

export const rowTop = style([flex.VERTICAL, { gap: spacing.xs }]);
export const rowBottom = style([
  flex.VERTICAL,
  { flexWrap: 'wrap', gap: spacing.sm },
]);

const field = style([
  font.body,
  {
    minHeight: '40px',
    padding: `0 ${spacing.sm}`,
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

export const day = style([field, { flexShrink: 0, width: '60px' }]);
export const hour = style([field, { flexShrink: 0, width: '86px' }]);
export const dash = style([font.body, { color: theme.textTertiary }]);

export const remove = style([
  pressable,
  flex.CENTER,
  {
    flexShrink: 0,
    marginLeft: 'auto',
    width: '32px',
    height: '32px',
    borderRadius: layout.radius.circle,
    fontSize: '18px',
    lineHeight: 1,
    color: theme.textTertiary,
    ':hover': { backgroundColor: theme.warnSoft, color: theme.warn },
  },
]);

export const room = style([
  field,
  {
    flexShrink: 0,
    width: '100px',
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
    /*
     * 아직 안 적힌 칸이 적힌 칸처럼 보이면 안 된다.
     *
     * 굵기까지 물려받는 바람에 본보기로 걸어 둔 `7-615` 가 실제로 읽어 낸 값과
     * 한눈에 구분되지 않았다. 못 읽은 칸을 찾으라고 만든 화면에서 그게 제일
     * 큰 흠이다.
     */
    '::placeholder': { fontWeight: 400, color: theme.textTertiary },
  },
]);

export const place = style([
  font.body,
  { flexShrink: 0, color: theme.textSecondary },
]);

export const placeBad = style([
  font.bodyStrong,
  { flexShrink: 0, color: theme.warn },
]);

export const addRow = style([
  pressable,
  font.bodyStrong,
  sizes.small,
  quiet,
  {
    flexShrink: 0,
    alignSelf: 'flex-start',
    ':hover': { color: theme.textPrimary, borderColor: theme.gray[300] },
  },
]);

/* ── 발 ───────────────────────────────────────────────────────────────── */

export const foot = style([
  flex.VERTICAL,
  {
    flexShrink: 0,
    gap: spacing.sm,
    padding: spacing.lg,
    borderTop: `1px solid ${theme.outline}`,
    backgroundColor: theme.surface,
    '@media': { [media.RAIL]: { padding: spacing.md } },
  },
]);

export const cancel = style([
  pressable,
  font.action,
  sizes.medium,
  quiet,
  { flexShrink: 0, padding: `0 ${spacing.lg}` },
]);

export const save = style([
  pressable,
  font.action,
  sizes.large,
  fill,
  { flex: 1 },
]);
