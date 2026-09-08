const layout = {
  contentWidth: '1160px',
  sideMargin: '28px',
  sideMarginMobile: '16px',
  /**
   * 가로로 돌린 폰에서 왼쪽에 세우는 기둥의 폭.
   *
   * 상단 띠가 이만큼 비켜 앉아야 하므로 한 곳에 적어 두고 나눠 쓴다.
   * 좁은 폰(667px)에서도 지도에 370px 은 남는 값이다.
   */
  railWidth: 'min(44%, 330px)',
  /**
   * 둥근 정도. 지도 위에 뜨는 판이라 전체적으로 각을 살린다.
   *
   * `circle` 은 값이 뻔해 보여도 이름을 준다. 정사각형 요소에만 쓰는
   * 약속이라, 값이 아니라 이름으로 그 약속을 적어 둔다.
   */
  radius: {
    xs: '4px',
    sm: '6px',
    md: '10px',
    pill: '999px',
    circle: '50%',
  },
} as const;

export default layout;
