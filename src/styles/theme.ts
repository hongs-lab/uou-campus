const gray = {
  900: '#111111',
  700: '#374151',
  500: '#6B7280',
  400: '#9CA3AF',
  300: '#D1D5DB',
  200: '#E5E7EB',
  100: '#F3F4F6',
  50: '#F8F9FB',
  0: '#FFFFFF',
} as const;

const theme = {
  gray,

  background: gray[50],
  surface: gray[0],
  track: gray[100],

  /** 울산대 CI 그린. scripts/uou-logo.svg 에서 그대로 뽑은 값이다. */
  accent: '#16A152',
  /** 위 색을 흰 바탕에 10% 로 얹은 톤. */
  accentSoft: '#E8F6EE',
  /**
   * 같은 색 20%. `accentSoft` 위에 한 겹 더 얹어야 할 때만 쓴다.
   *
   * 연한 톤이 하나뿐이면 강조 바탕 위에 얹힌 강조 요소가 바탕에 녹아
   * 사라진다. 한 단계를 더 두어 그 자리를 메운다.
   */
  accentTint: '#D0ECDC',
  onAccent: '#FFFFFF',

  warn: '#B45309',
  warnSoft: '#FFFBEB',
  ok: '#15803D',
  okSoft: '#F0FDF4',
  error: '#B91C1C',
  errorSoft: '#FEF2F2',

  outline: gray[200],

  textPrimary: gray[900],
  textSecondary: gray[500],
  textTertiary: gray[400],
} as const;

export default theme;
