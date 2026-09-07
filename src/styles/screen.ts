const screen = {
  desktop: '1280px',
  tablet: '1024px',
  phone: '768px',
  mobile: '480px',
  /**
   * 가로로 돌린 폰의 높이.
   *
   * 폭으로만 갈라 놓으면 폰을 돌리는 순간 어긋난다 — 요즘 폰은 가로로 들면
   * 폭이 850px 을 넘어 '넓은 화면' 규칙을 타지만, 높이는 400px 남짓이라
   * 위아래로 쌓아 둔 것이 화면 밖으로 넘친다. 그래서 납작한지를 따로 본다.
   */
  short: '500px',
  /** 위의 바로 다음 값. `min-height` 로 뒤집어 쓸 때 한 픽셀도 겹치지 않게. */
  tall: '501px',
  /** `phone` 의 바로 다음 값. `min-width` 로 뒤집어 쓸 때 쓴다. */
  wide: '769px',
} as const;

export default screen;
