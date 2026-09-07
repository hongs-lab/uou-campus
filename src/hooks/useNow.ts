import { useEffect, useState } from 'react';

/**
 * 지금 시각. 스스로 갱신된다.
 *
 * '다음 수업까지 30분' 같은 말은 가만 두면 금세 거짓말이 된다. 다만 초까지
 * 따라갈 일은 없어서 기본은 30초에 한 번이다 — 화면에 분 단위로만 쓰기 때문에
 * 그보다 자주 흔들어 봐야 다시 그리기만 한다.
 *
 * 탭을 뒤에 두면 브라우저가 타이머를 늦춘다. 돌아왔을 때 낡은 시각이 잠깐
 * 보이지 않도록, 화면이 다시 보이는 순간에도 한 번 맞춘다.
 */
export const useNow = (intervalMs = 30_000) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    const timer = setInterval(tick, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs]);

  return now;
};
