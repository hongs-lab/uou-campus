import { style } from '@vanilla-extract/css';
import { flex, font, layout, media, spacing, theme } from '@/styles';

/*
 * 폰에서 장소를 고르는 화면. 지도 위에 얹는 게 아니라 화면을 통째로 덮는다 —
 * 손바닥만 한 지도에서 지름 22px 짜리 점을 찍어 맞히라는 건 무리다.
 */
export const sheet = style([
  flex.COLUMN_FLEX,
  {
    position: 'fixed',
    inset: 0,
    zIndex: 60,
    backgroundColor: theme.surface,
    /* 아이폰 노치와 홈 바를 피한다. 가로로 돌리면 그 둘이 좌우로 온다. */
    paddingTop: 'env(safe-area-inset-top, 0px)',
    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    paddingLeft: 'env(safe-area-inset-left, 0px)',
    paddingRight: 'env(safe-area-inset-right, 0px)',
  },
]);

export const head = style([
  flex.VERTICAL,
  {
    flexShrink: 0,
    gap: spacing.sm,
    padding: `10px 10px 10px ${spacing.md}`,
    borderBottom: `1px solid ${theme.outline}`,

    '@media': {
      /* 가로에서는 높이가 곧 목록 줄 수다. 머리 칸부터 얇게 깎는다. */
      [media.RAIL]: { padding: `4px 10px 4px ${spacing.md}` },
    },
  },
]);

export const title = style([
  font.sectionTitle,
  { flex: 1, minWidth: 0, color: theme.textPrimary },
]);

export const close = style([
  flex.CENTER,
  {
    flexShrink: 0,
    width: '36px',
    height: '36px',
    borderRadius: layout.radius.circle,
    fontSize: '20px',
    lineHeight: 1,
    color: theme.textSecondary,

    ':hover': { backgroundColor: theme.gray[100], color: theme.textPrimary },
  },
]);

export const searchRow = style({
  flexShrink: 0,
  padding: `12px ${spacing.md}`,

  '@media': {
    [media.RAIL]: { padding: `8px ${spacing.md}` },
  },
});

export const search = style([
  font.body,
  {
    width: '100%',
    height: '44px',
    padding: `0 ${spacing.md}`,
    borderRadius: layout.radius.sm,
    border: `1px solid ${theme.outline}`,
    backgroundColor: theme.gray[50],
    color: theme.textPrimary,

    '::placeholder': { color: theme.textTertiary },
    ':focus': { borderColor: theme.accent, backgroundColor: theme.surface },
  },
]);

/* ── 빠른 선택 ─────────────────────────────────────────────────────────── */

export const quick = style([
  flex.COLUMN_FLEX,
  {
    flexShrink: 0,
    gap: '6px',
    padding: `0 ${spacing.md} 12px`,

    /* 가로에서는 폭이 남는다. 두 줄로 쌓지 말고 나란히 세운다. */
    '@media': {
      [media.RAIL]: { flexDirection: 'row', padding: `0 ${spacing.md} 8px` },
    },
  },
]);

export const quickRow = style([
  flex.VERTICAL,
  {
    gap: '10px',
    width: '100%',
    padding: '11px 12px',
    borderRadius: layout.radius.sm,
    border: `1px solid ${theme.outline}`,
    textAlign: 'left',

    ':hover': { borderColor: theme.accent, backgroundColor: theme.accentSoft },
    ':disabled': { opacity: 0.45, cursor: 'default' },

    '@media': {
      /* 나란히 설 때는 폭을 반씩 나눠 갖는다. */
      [media.RAIL]: { flex: '1 1 0', minWidth: 0, padding: '9px 12px' },
    },
  },
]);

/*
 * 줄에 손이 얹히면 줄 바탕이 `accentSoft` 로 바뀐다. 이 동그라미까지 같은
 * 톤이면 그 순간 바탕에 녹아 사라지므로, 한 단계 진한 톤으로 띄워 둔다.
 */
export const quickMark = style([
  flex.CENTER,
  {
    flexShrink: 0,
    width: '26px',
    height: '26px',
    borderRadius: layout.radius.circle,
    backgroundColor: theme.accentTint,
    color: theme.accent,
    fontSize: '13px',
  },
]);

export const quickText = style([
  font.bodyStrong,
  { flex: 1, minWidth: 0, color: theme.textPrimary },
]);

export const quickNote = style([
  font.caption,
  { flexShrink: 0, color: theme.textTertiary },
]);

/* ── 목록 ──────────────────────────────────────────────────────────────── */

export const list = style({
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  overscrollBehavior: 'contain',
  WebkitOverflowScrolling: 'touch',
  padding: `0 ${spacing.sm} ${spacing.lg}`,
});

/**
 * 한 묶음 안의 줄들.
 *
 * 세로에서는 그냥 한 줄씩 쌓인다. 가로로 돌리면 한 화면에 네 줄밖에 안 들어가
 * 목록이 아니라 창틈이 되므로, 남는 폭을 써서 두 칸으로 세운다.
 */
export const rows = style({
  '@media': {
    [media.RAIL]: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      columnGap: spacing.sm,
    },
  },
});

export const group = style([
  font.caption,
  {
    position: 'sticky',
    top: 0,
    zIndex: 1,
    padding: `8px ${spacing.sm} 6px`,
    backgroundColor: theme.surface,
    color: theme.textTertiary,
  },
]);

const rowBase = style([
  flex.VERTICAL,
  {
    gap: '10px',
    width: '100%',
    /* 손가락으로 눌러도 안 빗나가게 44px 을 지킨다. */
    minHeight: '48px',
    padding: `8px ${spacing.sm}`,
    borderRadius: layout.radius.sm,
    textAlign: 'left',

    ':hover': { backgroundColor: theme.gray[100] },
  },
]);

export const row = style([rowBase]);

/** 이미 골라 둔 곳. 손을 얹으면 한 단계만 진해진다. */
export const rowOn = style([
  rowBase,
  {
    backgroundColor: theme.accentSoft,
    ':hover': { backgroundColor: theme.accentTint },
  },
]);

/** 반대편 칸에 이미 들어가 있는 곳. 눌러도 경로가 안 나오니 눌러 둔다. */
export const rowTaken = style([rowBase, { opacity: 0.4 }]);

export const no = style([
  flex.CENTER,
  font.caption,
  {
    flexShrink: 0,
    width: '30px',
    height: '30px',
    borderRadius: layout.radius.sm,
    backgroundColor: theme.gray[100],
    color: theme.textSecondary,
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
  },
]);

export const noEmpty = style([no, { color: theme.textTertiary }]);

export const body = style([flex.COLUMN_FLEX, { flex: 1, minWidth: 0 }]);

export const name = style([
  font.body,
  {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: theme.textPrimary,
  },
]);

export const aliases = style([
  font.caption,
  {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: theme.textTertiary,
  },
]);

export const tag = style([
  font.caption,
  {
    flexShrink: 0,
    padding: '2px 6px',
    borderRadius: layout.radius.pill,
    backgroundColor: theme.warnSoft,
    color: theme.warn,
    fontSize: '10px',
  },
]);

export const here = style([
  font.caption,
  {
    flexShrink: 0,
    color: theme.accent,
    fontVariantNumeric: 'tabular-nums',
  },
]);

export const empty = style([
  font.body,
  { padding: `${spacing.lg} ${spacing.sm}`, color: theme.textTertiary },
]);
