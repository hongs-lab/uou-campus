import { style } from '@vanilla-extract/css';
import { flex, font, layout, theme } from '@/styles';

export const row = style([
  flex.START,
  {
    gap: '10px',
    padding: '7px 8px',
    borderRadius: layout.radius.sm,
    cursor: 'pointer',
    alignItems: 'flex-start',

    ':hover': { backgroundColor: theme.gray[50] },
  },
]);

export const rowDisabled = style([row, { cursor: 'default', opacity: 0.45 }]);

export const input = style({
  position: 'absolute',
  width: '1px',
  height: '1px',
  opacity: 0,
});

export const box = style({
  flexShrink: 0,
  width: '16px',
  height: '16px',
  marginTop: '1px',
  borderRadius: layout.radius.xs,
  border: `1.5px solid ${theme.gray[300]}`,
  backgroundColor: theme.surface,
  transition: 'background-color 0.12s, border-color 0.12s',

  selectors: {
    [`${input}:checked + &`]: {
      backgroundColor: theme.accent,
      borderColor: theme.accent,
      backgroundImage:
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M3.5 8.5l3 3 6-6' fill='none' stroke='white' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
      backgroundSize: '100%',
    },
    [`${input}:focus-visible + &`]: {
      outline: `2px solid ${theme.accent}`,
      outlineOffset: '2px',
    },
  },
});

export const text = style([flex.COLUMN_FLEX, { gap: '1px' }]);
export const label = style([font.body, { color: theme.textPrimary }]);
export const hint = style([font.caption, { color: theme.textTertiary }]);
