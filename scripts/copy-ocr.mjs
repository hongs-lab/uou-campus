/**
 * 글자 인식기 부속을 우리 쪽으로 옮긴다.
 *
 *   node scripts/copy-ocr.mjs      (빌드 전에 저절로 돕니다 — package.json 의 prebuild)
 *
 * tesseract 는 작업자 스크립트·WASM·언어 데이터를 따로 받아 쓰는데, 기본값은
 * 남의 CDN 이다. 그대로 두면 두 가지가 걸린다.
 *
 * 하나는 아예 안 돈다는 것. 브라우저는 다른 출처의 스크립트로 Worker 를 못
 * 만든다. 실제로 진행률 콜백조차 안 불리고 조용히 멈춰 있었다.
 *
 * 둘은 남의 CDN 에 매인다는 것. 이 앱은 캠퍼스 안에서 신호가 죽어도 돌라고
 * 만든 것이라, 첫 화면 밖의 기능이라도 남의 도메인에 걸어 둘 이유가 없다.
 *
 * 한국어 하나만 싣는다. 영어까지 실으면 13MB 가 더 붙는데, 재 보니 한국어만으로
 * 요일·시각·강의실이 다 읽힌다 — 하이픈이 자주 빠지지만 그건 `timetable/room.ts`
 * 의 되살리기가 잡는다(12/12 확인).
 */

import { copyFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const OUT = resolve(ROOT, 'public/ocr');

/**
 * 무엇을 옮기는지.
 *
 * WASM 은 네 벌이 들어 있다. 그중 `simd-lstm` 만 쓴다 — 다른 셋은 옛 인식기
 * 방식까지 담아 크고, 요즘 브라우저는 모두 SIMD 를 쓴다.
 *
 * WASM 은 네 벌이 들어 있다. 그중 LSTM 만 담은 셋을 옮긴다 — 옛 인식기 방식은
 * 이 앱에 필요 없다. 셋을 다 두는 것은 어느 것을 쓸지 브라우저가 정하기
 * 때문이다(SIMD 를 얼마나 쓸 수 있는지 보고 고른다). 서버에는 셋이 놓이지만
 * 받는 쪽은 그중 하나만 받는다.
 *
 * 알맹이를 품은 `.wasm.js` 한 파일을 옮긴다. `.js` + `.wasm` 으로 나눠 둔 것이
 * 1MB 가볍지만, tesseract 는 나뉜 쪽을 안 찾는다 — 그걸 가리키면 작업자 안에서
 * 알맹이 주소를 못 풀어 멈춘다. 재 보고 이쪽으로 왔다.
 */
const VARIANTS = ['relaxedsimd-lstm', 'simd-lstm', 'lstm'];

const FILES = [
  ['tesseract.js/dist/worker.min.js', 'worker.min.js'],
  [
    '@tesseract.js-data/kor/4.0.0_best_int/kor.traineddata.gz',
    'kor.traineddata.gz',
  ],
  ...VARIANTS.map((v) => [
    `tesseract.js-core/tesseract-core-${v}.wasm.js`,
    `tesseract-core-${v}.wasm.js`,
  ]),
];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

let total = 0;
for (const [from, to] of FILES) {
  const source = resolve(ROOT, 'node_modules', from);
  const target = join(OUT, to);
  copyFileSync(source, target);
  const size = readFileSync(target).length;
  total += size;
  console.log(`  ${(size / 1024 / 1024).toFixed(2)} MB  ${to}`);
}

console.log(
  `public/ocr — ${FILES.length}개, 모두 ${(total / 1024 / 1024).toFixed(1)} MB`,
);
console.log('시간표를 올리는 사람만, 올리는 그 순간에 받는다.');
