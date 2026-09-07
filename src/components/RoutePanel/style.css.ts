import { style } from '@vanilla-extract/css';
import { elevation, flex, font, layout, media, spacing, theme } from '@/styles';

export const panel = style([
  flex.COLUMN_FLEX,
  {
    position: 'absolute',
    zIndex: 20,
    top: spacing.md,
    left: spacing.md,
    width: '380px',
    maxHeight: `calc(100% - ${spacing.md} * 2)`,
    borderRadius: layout.radius.md,
    border: `1px solid ${theme.outline}`,
    backgroundColor: theme.surface,
    boxShadow: elevation.overlay,
    overflow: 'hidden',

    '@media': {
      /* 좁은 화면에서는 아래에서 올라오는 시트가 된다. 지도를 덜 가리려고. */
      [media.SHEET]: {
        top: 'auto',
        bottom: 0,
        left: 0,
        right: 0,
        width: 'auto',
        /*
         * 접을 수 있게 되었으니 펼친 높이는 넉넉히 준다. 접으면 손잡이와 요약
         * 한 줄만 남고 지도가 화면을 거의 다 쓴다.
         */
        maxHeight: '76%',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        borderRadius: `${layout.radius.md} ${layout.radius.md} 0 0`,
        borderBottom: 'none',
      },

      /*
       * 가로로 돌린 폰에서는 왼쪽에 세우는 기둥이 된다.
       *
       * 같은 시트를 그대로 올리면 화면 높이 375px 중 285px 을 물어 지도에
       * 90px 만 남는다 — 캠퍼스가 한 줄로 눌린다. 가로에서는 폭이 남으니
       * 옆을 내주고, 지도에 정사각형에 가까운 자리를 남긴다.
       *
       * 노치는 세로로 들 때 위에 있지만 가로에서는 왼쪽이나 오른쪽으로 온다.
       * 기둥이 붙는 왼쪽 여백을 따로 챙긴다.
       */
      [media.RAIL]: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 'auto',
        width: layout.railWidth,
        maxHeight: 'none',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        borderRadius: `0 ${layout.radius.md} ${layout.radius.md} 0`,
        borderLeft: 'none',
      },
    },
  },
]);

/**
 * 지도에서 곳을 고르는 동안. 화면 밖으로 내려보낸다.
 *
 * 폰에서만 치운다 — 넓은 화면에서는 패널이 지도를 가리지 않으니 그대로 두는 게
 * 낫다. 고르는 중에도 목록이 눈에 보인다.
 */
export const panelHidden = style([
  panel,
  {
    '@media': {
      [media.SHEET]: {
        transform: 'translateY(105%)',
        /* 내려간 시트가 지도 손짓을 가로채면 곤란하다. */
        pointerEvents: 'none',
      },
      /* 기둥은 아래가 아니라 옆으로 빠진다. 나가는 방향만 다르고 뜻은 같다. */
      [media.RAIL]: {
        transform: 'translateX(-105%)',
        pointerEvents: 'none',
      },
    },
  },
]);

/* ── 손잡이와 요약 한 줄 (폰) ───────────────────────────────────────────── */

/**
 * 접힌 시트에서 유일하게 보이는 부분.
 *
 * 끌어서 접고 펴고, 그냥 눌러도 뒤집힌다. touchAction 을 끄지 않으면 브라우저가
 * 이 드래그를 화면 스크롤로 가져가 버린다.
 */
export const handle = style([
  flex.COLUMN_FLEX,
  {
    flexShrink: 0,
    padding: '7px 0 10px',
    touchAction: 'none',
    cursor: 'grab',
  },
]);

export const grip = style({
  alignSelf: 'center',
  width: '38px',
  height: '4px',
  borderRadius: layout.radius.pill,
  backgroundColor: theme.gray[300],
});

export const bar = style([
  flex.VERTICAL,
  {
    gap: '10px',
    minHeight: '46px',
    padding: `4px ${spacing.md} 0`,
  },
]);

export const barText = style([
  flex.COLUMN_FLEX,
  { flex: 1, minWidth: 0, gap: '1px' },
]);

export const barMetric = style([
  flex.VERTICAL,
  { gap: '6px', color: theme.textPrimary },
]);

export const barValue = style([font.metric, { fontSize: '19px' }]);

export const barSub = style([font.metricSmall, { color: theme.textSecondary }]);

export const barNote = style([
  font.body,
  {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: theme.textSecondary,
  },
]);

export const barWarn = style([barNote, { color: theme.warn }]);

export const chevron = style([
  flex.CENTER,
  {
    flexShrink: 0,
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    fontSize: '11px',
    color: theme.textTertiary,

    ':hover': { backgroundColor: theme.gray[100], color: theme.textPrimary },
  },
]);

/* ── 안내 시작 ─────────────────────────────────────────────────────────── */

export const start = style([
  font.bodyStrong,
  {
    flexShrink: 0,
    padding: '9px 16px',
    borderRadius: layout.radius.pill,
    backgroundColor: theme.accent,
    color: theme.onAccent,

    ':hover': { opacity: 0.9 },
  },
]);

export const startOn = style([
  start,
  { backgroundColor: theme.gray[900], color: theme.gray[0] },
]);

/** 넓은 화면 패널 안에 놓는 같은 단추. 폭을 다 쓴다. */
export const startRow = style({ padding: `0 ${spacing.md} 12px` });

export const startWide = style([start, { display: 'block', width: '100%' }]);
export const startWideOn = style([
  startWide,
  { backgroundColor: theme.gray[900], color: theme.gray[0] },
]);

/* ── 폰에서 고르는 칸 ──────────────────────────────────────────────────── */

export const phoneFields = style([
  flex.VERTICAL,
  { gap: spacing.sm, padding: `${spacing.md} ${spacing.md} 10px` },
]);

export const phoneStack = style([
  flex.COLUMN_FLEX,
  { flex: 1, minWidth: 0, gap: '6px' },
]);

const pickerBase = style([
  flex.VERTICAL,
  {
    gap: '10px',
    width: '100%',
    /* 손가락으로 눌러도 안 빗나가는 최소 크기. */
    minHeight: '44px',
    padding: '0 12px',
    borderRadius: layout.radius.sm,
    border: `1px solid ${theme.outline}`,
    backgroundColor: theme.surface,
    textAlign: 'left',

    ':hover': { borderColor: theme.gray[300] },
  },
]);

export const pickerField = style([pickerBase]);
export const pickerFieldSet = style([
  pickerBase,
  { borderColor: theme.accent },
]);

export const pickerLabel = style([
  font.caption,
  { flexShrink: 0, width: '26px', color: theme.textTertiary },
]);

export const pickerValue = style([
  font.bodyStrong,
  {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: theme.textPrimary,
  },
]);

export const pickerEmpty = style([
  pickerValue,
  { fontWeight: 400, color: theme.textTertiary },
]);

export const phoneSwap = style([
  flex.CENTER,
  {
    flexShrink: 0,
    width: '44px',
    alignSelf: 'stretch',
    borderRadius: layout.radius.sm,
    border: `1px solid ${theme.outline}`,
    fontSize: '17px',
    color: theme.textSecondary,

    ':hover': { color: theme.textPrimary, borderColor: theme.gray[300] },
  },
]);

/** 손잡이 아래 나머지 전부. 시트를 접으면 이 덩이가 0 으로 눌린다. */
export const body = style([
  flex.COLUMN_FLEX,
  {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',

    '@media': {
      /*
       * 기둥에서는 안내 목록만 따로 구르지 않고 기둥 전체가 구른다.
       *
       * 높이가 390px 밖에 없어, 제목·칸·기준을 고정해 두면 목록에 남는 자리가
       * 한 줄도 안 된다. 위에서 아래로 쭉 미는 편이 읽힌다.
       */
      [media.RAIL]: {
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch',
      },
    },
  },
]);

export const header = style([
  flex.BETWEEN,
  {
    padding: `12px ${spacing.md}`,
    borderBottom: `1px solid ${theme.outline}`,
  },
]);

export const title = style([font.appTitle, { fontSize: '17px' }]);

export const edit = style([
  font.caption,
  {
    padding: '5px 10px',
    borderRadius: layout.radius.pill,
    border: `1px solid ${theme.outline}`,
    color: theme.textSecondary,

    ':hover': { color: theme.textPrimary, borderColor: theme.gray[300] },
  },
]);

export const editOn = style([
  edit,
  {
    borderColor: theme.warn,
    backgroundColor: theme.warnSoft,
    color: theme.warn,
    ':hover': { color: theme.warn, borderColor: theme.warn },
  },
]);

export const fields = style([
  {
    display: 'flex',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: `${spacing.md} ${spacing.md} 10px`,
  },
]);

export const swap = style([
  flex.CENTER,
  {
    flexShrink: 0,
    width: '30px',
    height: '36px',
    borderRadius: layout.radius.sm,
    fontSize: '15px',
    color: theme.textTertiary,

    ':hover': { backgroundColor: theme.gray[100], color: theme.textPrimary },
  },
]);

export const geoRow = style([
  flex.VERTICAL,
  { gap: spacing.sm, padding: `0 ${spacing.md} 10px` },
]);

export const geo = style([
  font.caption,
  {
    padding: '5px 11px',
    borderRadius: layout.radius.pill,
    border: `1px solid ${theme.outline}`,
    color: theme.textSecondary,
    ':hover': { color: theme.textPrimary, borderColor: theme.gray[300] },
  },
]);

export const geoOn = style([
  geo,
  { borderColor: '#2563EB', color: '#2563EB', backgroundColor: '#EFF6FF' },
]);

export const geoNote = style([font.caption, { color: theme.textTertiary }]);

export const controls = style([
  flex.COLUMN_FLEX,
  {
    gap: '2px',
    padding: `0 ${spacing.md} 12px`,
    borderBottom: `1px solid ${theme.outline}`,
    alignItems: 'flex-start',
  },
]);

export const result = style({
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  overscrollBehavior: 'contain',

  '@media': {
    /* 기둥에서는 바깥(body)이 구른다. 안쪽까지 구르면 스크롤이 둘로 갈린다. */
    [media.RAIL]: {
      flex: '0 0 auto',
      minHeight: 'auto',
      overflowY: 'visible',
    },
  },
});

export const empty = style([
  font.body,
  { padding: spacing.md, color: theme.textTertiary },
]);

export const warn = style([
  font.body,
  {
    margin: spacing.md,
    padding: '10px 12px',
    borderRadius: layout.radius.sm,
    backgroundColor: theme.warnSoft,
    color: theme.warn,
  },
]);

/* ── 따라가기 ───────────────────────────────────────────────────────────── */

export const follow = style([
  flex.COLUMN_FLEX,
  {
    gap: '6px',
    padding: `12px ${spacing.md}`,
    borderBottom: `1px solid ${theme.outline}`,
    backgroundColor: theme.accentSoft,
    alignItems: 'flex-start',
  },
]);

export const followLost = style([follow, { backgroundColor: theme.warnSoft }]);

export const followHead = style([
  flex.VERTICAL,
  { flexWrap: 'wrap', gap: spacing.sm },
]);

export const followMetric = style([font.metric, { color: theme.textPrimary }]);

export const followSub = style([
  font.metricSmall,
  { color: theme.textSecondary },
]);

export const followOff = style([
  font.caption,
  { marginLeft: 'auto', color: theme.textTertiary },
]);

export const followStep = style([
  font.bodyStrong,
  { color: theme.textPrimary },
]);

export const followNote = style([font.caption, { color: theme.warn }]);

export const simRow = style([
  flex.VERTICAL,
  {
    flexWrap: 'wrap',
    gap: '5px',
    marginTop: '2px',
    paddingTop: '8px',
    borderTop: `1px dashed ${theme.outline}`,
    width: '100%',
  },
]);

export const simTag = style([
  font.caption,
  { marginRight: '2px', color: theme.textTertiary },
]);

export const simButton = style([
  font.caption,
  {
    padding: '4px 9px',
    borderRadius: layout.radius.pill,
    border: `1px solid ${theme.outline}`,
    backgroundColor: theme.surface,
    color: theme.textSecondary,

    ':hover': { color: theme.textPrimary, borderColor: theme.gray[300] },
    ':disabled': { opacity: 0.4, cursor: 'default' },
  },
]);

export const simSpeed = style([
  simButton,
  { minWidth: '34px', fontVariantNumeric: 'tabular-nums' },
]);

export const simSpeedOn = style([
  simSpeed,
  {
    borderColor: theme.accent,
    backgroundColor: theme.accent,
    color: theme.onAccent,
    ':hover': { color: theme.onAccent, borderColor: theme.accent },
  },
]);

/* ── 요약 ───────────────────────────────────────────────────────────────── */

export const summary = style([
  flex.COLUMN_FLEX,
  { gap: '10px', padding: `${spacing.md} ${spacing.md} 12px` },
]);

export const headline = style([flex.VERTICAL, { gap: spacing.sm }]);
export const metric = style([font.metric, { color: theme.textPrimary }]);
export const metricSub = style([
  font.metricSmall,
  { color: theme.textSecondary },
]);

export const stats = style([flex.VERTICAL, { flexWrap: 'wrap', gap: '6px' }]);

export const stat = style([
  flex.VERTICAL,
  {
    gap: '5px',
    padding: '3px 9px',
    borderRadius: layout.radius.pill,
    backgroundColor: theme.gray[100],
  },
]);

export const statLabel = style([font.caption, { color: theme.textSecondary }]);
export const statValue = style([
  font.caption,
  {
    fontWeight: 700,
    color: theme.textPrimary,
    fontVariantNumeric: 'tabular-nums',
  },
]);

export const saved = style([
  font.caption,
  {
    padding: '8px 10px',
    borderRadius: layout.radius.sm,
    backgroundColor: theme.accentSoft,
    color: theme.ok,
    lineHeight: 1.55,
  },
]);

export const savedFlat = style([
  font.caption,
  {
    padding: '8px 10px',
    borderRadius: layout.radius.sm,
    backgroundColor: theme.gray[100],
    color: theme.textSecondary,
  },
]);

export const compare = style([
  font.caption,
  {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '5px',
    padding: '8px 10px',
    borderRadius: layout.radius.sm,
    backgroundColor: theme.warnSoft,
    color: theme.warn,
  },
]);

export const compareDot = style({
  width: '14px',
  height: '0',
  borderTop: `2px dashed ${theme.warn}`,
});

export const compareText = style({ flex: 1, minWidth: 0 });
export const compareHint = style({ width: '100%', opacity: 0.75 });

/* ── 안내문 ─────────────────────────────────────────────────────────────── */

export const steps = style({
  padding: `0 ${spacing.md} ${spacing.md}`,
});

const stepRow = style({
  display: 'grid',
  gridTemplateColumns: '18px 1fr',
  gap: spacing.sm,
});

export const step = style([stepRow, { paddingBottom: '14px' }]);
export const stepLast = style([stepRow, { alignItems: 'center' }]);

/** 왼쪽에 이어지는 세로선. 마지막 칸만 점으로 끊는다. */
export const stepRail = style({
  position: 'relative',
  width: '18px',

  '::before': {
    content: '""',
    position: 'absolute',
    top: '5px',
    left: '6px',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: theme.accent,
  },
  '::after': {
    content: '""',
    position: 'absolute',
    top: '13px',
    bottom: '-10px',
    left: '8px',
    width: '2px',
    backgroundColor: theme.gray[200],
  },
});

export const stepRailEnd = style({
  position: 'relative',
  width: '18px',
  height: '14px',

  '::before': {
    content: '""',
    position: 'absolute',
    top: '2px',
    left: '3px',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    border: `3px solid ${theme.gray[900]}`,
  },
});

export const stepBody = style([flex.COLUMN_FLEX, { gap: '4px' }]);
export const stepText = style([font.body, { color: theme.textPrimary }]);

export const stepTags = style([
  flex.VERTICAL,
  { flexWrap: 'wrap', gap: '5px' },
]);

export const tag = style([
  font.caption,
  {
    padding: '1px 6px',
    borderRadius: layout.radius.pill,
    backgroundColor: theme.gray[100],
    color: theme.textSecondary,
    fontSize: '11px',
  },
]);

export const tagCut = style([
  tag,
  { backgroundColor: theme.accentSoft, color: theme.accent, fontWeight: 700 },
]);

export const stepMeters = style([
  font.caption,
  { color: theme.textTertiary, fontVariantNumeric: 'tabular-nums' },
]);

/* ── 다음 수업 ──────────────────────────────────────────────────────────── */

const classRowBase = style([
  flex.VERTICAL,
  {
    gap: spacing.sm,
    padding: `10px ${spacing.md} 12px`,
    borderBottom: `1px solid ${theme.outline}`,
  },
]);

export const classRow = style([classRowBase]);

/** 이미 나섰어야 하는 시각이 지났다. 색으로 먼저 말한다. */
export const classRowLate = style([
  classRowBase,
  { backgroundColor: theme.warnSoft },
]);

export const classText = style([
  flex.COLUMN_FLEX,
  { flex: 1, minWidth: 0, gap: '3px' },
]);

export const classHead = style([flex.VERTICAL, { gap: '7px', minWidth: 0 }]);

export const classWhen = style([
  font.caption,
  {
    flexShrink: 0,
    padding: '2px 8px',
    borderRadius: layout.radius.pill,
    backgroundColor: theme.accent,
    color: theme.onAccent,
    fontWeight: 700,
  },
]);

export const classTitle = style([
  font.bodyStrong,
  {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: theme.textPrimary,
  },
]);

export const classSub = style([font.caption, { color: theme.textSecondary }]);

export const classLeave = style([
  font.caption,
  { color: theme.ok, fontWeight: 700 },
]);

export const classLeaveLate = style([
  font.caption,
  { color: theme.warn, fontWeight: 700 },
]);

/** 셈한 근거. 작게 붙여 둔다 — 안 맞다 싶을 때 어디가 틀렸는지 보이게. */
export const classBreak = style({ fontWeight: 400, opacity: 0.8 });

export const classNote = style([
  font.caption,
  { flex: 1, color: theme.textTertiary },
]);

export const classAdd = style([
  font.caption,
  {
    flex: 1,
    minHeight: '38px',
    padding: '8px 12px',
    borderRadius: layout.radius.sm,
    border: `1px dashed ${theme.outline}`,
    color: theme.textSecondary,
    ':hover': { borderColor: theme.accent, color: theme.accent },
  },
]);

export const classGo = style([
  font.caption,
  {
    flexShrink: 0,
    padding: '7px 13px',
    borderRadius: layout.radius.pill,
    backgroundColor: theme.accent,
    color: theme.onAccent,
    fontWeight: 700,
    ':hover': { opacity: 0.9 },
  },
]);

export const classEdit = style([
  font.caption,
  {
    flexShrink: 0,
    padding: '6px 10px',
    borderRadius: layout.radius.pill,
    border: `1px solid ${theme.outline}`,
    color: theme.textTertiary,
    ':hover': { color: theme.textPrimary, borderColor: theme.gray[300] },
  },
]);
