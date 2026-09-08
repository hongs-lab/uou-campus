import { style } from '@vanilla-extract/css';
import { elevation, flex, font, layout, theme } from '@/styles';

export const holder = style({ position: 'relative', flex: 1, minWidth: 0 });

export const label = style([
  font.caption,
  {
    display: 'block',
    marginBottom: '3px',
    color: theme.textTertiary,
  },
]);

export const field = style([
  flex.VERTICAL,
  {
    gap: '4px',
    padding: '0 8px 0 10px',
    height: '36px',
    borderRadius: layout.radius.sm,
    border: `1px solid ${theme.outline}`,
    backgroundColor: theme.surface,
    transition: 'border-color 0.12s',

    ':hover': { borderColor: theme.gray[300] },
  },
]);

export const fieldOpen = style([
  field,
  { borderColor: theme.accent, ':hover': { borderColor: theme.accent } },
]);

export const input = style([
  font.body,
  {
    flex: 1,
    minWidth: 0,
    width: '100%',
    backgroundColor: 'transparent',
    color: theme.textPrimary,

    '::placeholder': { color: theme.textTertiary },
  },
]);

export const clear = style([
  flex.CENTER,
  {
    flexShrink: 0,
    width: '20px',
    height: '20px',
    borderRadius: layout.radius.circle,
    fontSize: '15px',
    lineHeight: 1,
    color: theme.textTertiary,

    ':hover': { backgroundColor: theme.gray[100], color: theme.textPrimary },
  },
]);

export const list = style({
  position: 'absolute',
  zIndex: 30,
  top: 'calc(100% + 4px)',
  left: 0,
  right: 0,
  padding: '4px',
  borderRadius: layout.radius.md,
  border: `1px solid ${theme.outline}`,
  backgroundColor: theme.surface,
  boxShadow: elevation.overlay,
});

const optionBase = style([
  flex.VERTICAL,
  {
    gap: '8px',
    width: '100%',
    padding: '7px 8px',
    borderRadius: layout.radius.sm,
    textAlign: 'left',
  },
]);

export const option = style([optionBase]);
export const optionActive = style([
  optionBase,
  { backgroundColor: theme.accentSoft },
]);

export const no = style([
  flex.CENTER,
  font.caption,
  {
    flexShrink: 0,
    width: '22px',
    height: '20px',
    borderRadius: layout.radius.xs,
    backgroundColor: theme.gray[100],
    color: theme.textSecondary,
    fontVariantNumeric: 'tabular-nums',
  },
]);

export const noEmpty = style([no, { color: theme.textTertiary }]);

export const name = style([
  font.body,
  {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: theme.textPrimary,
  },
]);

export const approx = style([
  font.caption,
  {
    flexShrink: 0,
    padding: '1px 5px',
    borderRadius: layout.radius.pill,
    backgroundColor: theme.warnSoft,
    color: theme.warn,
    fontSize: '10px',
  },
]);

export const empty = style([
  font.body,
  { padding: '10px 8px', color: theme.textTertiary },
]);
