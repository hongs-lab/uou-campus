import { style } from '@vanilla-extract/css';
import { elevation, flex, font, layout, media, spacing, theme } from '@/styles';

export const panel = style([
  flex.COLUMN_FLEX,
  {
    position: 'absolute',
    zIndex: 20,
    top: spacing.md,
    right: spacing.md,
    width: '300px',
    maxHeight: `calc(100% - ${spacing.md} * 2)`,
    borderRadius: layout.radius.md,
    border: `1px solid ${theme.warn}`,
    backgroundColor: theme.surface,
    boxShadow: elevation.overlay,
    overflow: 'hidden',

    '@media': {
      [media.SHEET]: {
        top: spacing.sm,
        right: spacing.sm,
        left: spacing.sm,
        width: 'auto',
        maxHeight: '34%',
      },

      /*
       * 가로에서는 위아래로 눌러 봐야 세 줄밖에 안 남는다. 길찾기 기둥 맞은편에
       * 같은 높이로 세워 두면 좌표 칸과 길 잇기가 한눈에 들어온다.
       */
      [media.RAIL]: {
        top: spacing.sm,
        bottom: spacing.sm,
        left: 'auto',
        right: `calc(${spacing.sm} + env(safe-area-inset-right, 0px))`,
        width: '288px',
        maxHeight: 'none',
      },
    },
  },
]);

export const header = style([
  flex.BETWEEN,
  {
    padding: `10px ${spacing.md}`,
    borderBottom: `1px solid ${theme.outline}`,
    backgroundColor: theme.warnSoft,
  },
]);

export const title = style([font.sectionTitle, { color: theme.warn }]);
export const count = style([font.caption, { color: theme.warn, opacity: 0.8 }]);

export const body = style({
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  overscrollBehavior: 'contain',
  padding: spacing.md,
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.md,
});

export const guide = style([
  font.caption,
  {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    color: theme.textSecondary,
    listStyle: 'decimal',
    paddingLeft: '16px',

    selectors: { '&': { listStyle: 'decimal' } },
  },
]);

export const link = style([
  font.caption,
  {
    marginTop: '3px',
    padding: '4px 10px',
    borderRadius: layout.radius.pill,
    border: `1px solid ${theme.outline}`,
    color: theme.textSecondary,
    ':hover': { borderColor: theme.gray[300], color: theme.textPrimary },
  },
]);

export const linkOn = style([
  link,
  {
    borderColor: theme.accent,
    backgroundColor: theme.accentSoft,
    color: theme.accent,
  },
]);

export const linkCancel = style([
  font.caption,
  {
    marginLeft: '6px',
    color: theme.textTertiary,
    ':hover': { color: theme.error },
  },
]);

export const section = style([
  flex.COLUMN_FLEX,
  {
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTop: `1px solid ${theme.outline}`,
    alignItems: 'stretch',
  },
]);

export const sectionTitle = style([
  flex.BETWEEN,
  font.label,
  { color: theme.textPrimary },
]);

export const id = style([
  font.caption,
  { color: theme.textTertiary, fontWeight: 400 },
]);

export const field = style([flex.VERTICAL, { gap: spacing.sm }]);

export const fieldLabel = style([
  font.caption,
  { flexShrink: 0, width: '58px', color: theme.textTertiary },
]);

export const input = style([
  font.body,
  {
    flex: 1,
    minWidth: 0,
    padding: '6px 9px',
    borderRadius: layout.radius.sm,
    border: `1px solid ${theme.outline}`,
    backgroundColor: theme.surface,
    color: theme.textPrimary,

    ':focus': { borderColor: theme.accent },
  },
]);

export const meta = style([
  font.caption,
  { color: theme.textTertiary, fontVariantNumeric: 'tabular-nums' },
]);

export const code = style({
  padding: '1px 4px',
  borderRadius: layout.radius.xs,
  backgroundColor: theme.gray[100],
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '11px',
});

export const actions = style([flex.VERTICAL, { flexWrap: 'wrap', gap: '6px' }]);

export const action = style([
  font.caption,
  {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '5px 10px',
    borderRadius: layout.radius.pill,
    border: `1px solid ${theme.outline}`,
    color: theme.textSecondary,
    cursor: 'pointer',

    ':hover': { borderColor: theme.gray[300], color: theme.textPrimary },
    ':disabled': { opacity: 0.45, cursor: 'default' },
  },
]);

export const file = style({ display: 'none' });

export const danger = style([
  font.caption,
  {
    alignSelf: 'flex-start',
    padding: '5px 10px',
    borderRadius: layout.radius.pill,
    border: `1px solid ${theme.errorSoft}`,
    backgroundColor: theme.errorSoft,
    color: theme.error,

    ':hover': { borderColor: theme.error },
  },
]);

/** 좌표 줄. 오른쪽에 근사 딱지가 붙는다. */
export const coord = style([meta, { flex: 1, minWidth: 0 }]);

/**
 * '이 좌표는 아직 못 믿는다' 고 스스로 적어 두는 딱지.
 *
 * 안내도만 보고 대충 찍은 자리가 실측과 같은 얼굴을 하고 있으면, 나중에 무엇을
 * 걸어 보고 확인해야 하는지 알 수가 없다.
 */
export const approxOn = style([
  action,
  {
    borderColor: theme.warn,
    backgroundColor: theme.warnSoft,
    color: theme.warn,
    ':hover': { borderColor: theme.warn, color: theme.warn },
  },
]);

/** 모두에게 저장한 결과. 성공과 실패를 색으로 가른다. */
export const said = style([
  font.caption,
  {
    padding: '7px 9px',
    borderRadius: layout.radius.sm,
    backgroundColor: theme.okSoft,
    color: theme.ok,
    lineHeight: 1.55,
  },
]);

export const saidBad = style([
  said,
  { backgroundColor: theme.errorSoft, color: theme.error },
]);

/** 아직 길에 안 이어진 곳이라고 일러 주는 줄. */
export const caution = style([
  font.caption,
  {
    padding: '7px 9px',
    borderRadius: layout.radius.sm,
    backgroundColor: theme.warnSoft,
    color: theme.warn,
    lineHeight: 1.55,
  },
]);
