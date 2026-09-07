import { style } from '@vanilla-extract/css';
import { flex, font, layout, media, spacing, theme } from '@/styles';

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
  },
]);

export const head = style([
  flex.VERTICAL,
  {
    flexShrink: 0,
    gap: spacing.sm,
    padding: `10px 10px 10px ${spacing.md}`,
    borderBottom: `1px solid ${theme.outline}`,
    '@media': { [media.RAIL]: { padding: `4px 10px 4px ${spacing.md}` } },
  },
]);

export const title = style([
  font.sectionTitle,
  { flex: 1, minWidth: 0, color: theme.textPrimary },
]);

export const textButton = style([
  font.caption,
  {
    flexShrink: 0,
    padding: '5px 10px',
    borderRadius: layout.radius.pill,
    border: `1px solid ${theme.outline}`,
    color: theme.textSecondary,
    ':hover': { color: theme.warn, borderColor: theme.warn },
  },
]);

export const close = style([
  flex.CENTER,
  {
    flexShrink: 0,
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    fontSize: '20px',
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
    gap: '10px',
    overflowY: 'auto',
    overscrollBehavior: 'contain',
    WebkitOverflowScrolling: 'touch',
    padding: spacing.md,
  },
]);

export const upload = style([
  font.bodyStrong,
  {
    flexShrink: 0,
    width: '100%',
    minHeight: '52px',
    padding: '14px 16px',
    borderRadius: layout.radius.sm,
    border: `1px dashed ${theme.accent}`,
    backgroundColor: theme.accentSoft,
    color: theme.accent,
    ':hover': { opacity: 0.85 },
    ':disabled': { cursor: 'default', opacity: 0.7 },
  },
]);

export const hint = style([
  font.caption,
  { color: theme.textTertiary, lineHeight: 1.6 },
]);

export const warn = style([
  font.caption,
  {
    padding: '9px 11px',
    borderRadius: layout.radius.sm,
    backgroundColor: theme.warnSoft,
    color: theme.warn,
    lineHeight: 1.55,
  },
]);

export const empty = style([
  font.body,
  { padding: `${spacing.lg} 0`, color: theme.textTertiary },
]);

export const rows = style([flex.COLUMN_FLEX, { gap: '8px' }]);

const rowBase = style([
  flex.COLUMN_FLEX,
  {
    gap: '7px',
    padding: '10px',
    borderRadius: layout.radius.sm,
    border: `1px solid ${theme.outline}`,
  },
]);

export const row = style([rowBase]);

/** 강의실이 캠퍼스 건물과 안 맞는 칸. 먼저 눈에 띄어야 고친다. */
export const rowBad = style([
  rowBase,
  { borderColor: theme.warn, backgroundColor: theme.warnSoft },
]);

export const rowTop = style([flex.VERTICAL, { gap: '6px' }]);
export const rowBottom = style([
  flex.VERTICAL,
  { flexWrap: 'wrap', gap: '6px' },
]);

const field = style([
  font.body,
  {
    minHeight: '38px',
    padding: '0 8px',
    borderRadius: layout.radius.sm,
    border: `1px solid ${theme.outline}`,
    backgroundColor: theme.surface,
    color: theme.textPrimary,
    ':focus': { borderColor: theme.accent },
  },
]);

export const day = style([field, { flexShrink: 0, width: '58px' }]);
export const hour = style([field, { flexShrink: 0, width: '84px' }]);
export const dash = style([font.caption, { color: theme.textTertiary }]);

export const remove = style([
  flex.CENTER,
  {
    flexShrink: 0,
    marginLeft: 'auto',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    fontSize: '17px',
    lineHeight: 1,
    color: theme.textTertiary,
    ':hover': { backgroundColor: theme.warnSoft, color: theme.warn },
  },
]);

export const room = style([
  field,
  {
    flexShrink: 0,
    width: '96px',
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
  },
]);

export const place = style([
  font.caption,
  { flexShrink: 0, color: theme.textSecondary },
]);

export const placeBad = style([
  font.caption,
  { flexShrink: 0, color: theme.warn, fontWeight: 700 },
]);

export const titleInput = style([
  field,
  { flex: 1, minWidth: '140px', fontSize: '13px' },
]);

export const addRow = style([
  font.caption,
  {
    flexShrink: 0,
    alignSelf: 'flex-start',
    padding: '7px 13px',
    borderRadius: layout.radius.pill,
    border: `1px solid ${theme.outline}`,
    color: theme.textSecondary,
    ':hover': { color: theme.textPrimary, borderColor: theme.gray[300] },
  },
]);

export const foot = style([
  flex.VERTICAL,
  {
    flexShrink: 0,
    gap: spacing.sm,
    padding: spacing.md,
    borderTop: `1px solid ${theme.outline}`,
  },
]);

export const cancel = style([
  font.body,
  {
    flexShrink: 0,
    padding: '12px 18px',
    borderRadius: layout.radius.pill,
    border: `1px solid ${theme.outline}`,
    color: theme.textSecondary,
    ':hover': { color: theme.textPrimary, borderColor: theme.gray[300] },
  },
]);

export const save = style([
  font.bodyStrong,
  {
    flex: 1,
    minHeight: '46px',
    borderRadius: layout.radius.pill,
    backgroundColor: theme.accent,
    color: theme.onAccent,
    ':hover': { opacity: 0.9 },
    ':disabled': { opacity: 0.5, cursor: 'default' },
  },
]);
