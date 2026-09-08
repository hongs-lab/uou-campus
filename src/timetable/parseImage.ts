import type { Weekday } from '@/types/timetable';
import { buildingNoOf, looksLikeRoomCode, repairRoom } from './room';

/**
 * 에브리타임에서 내려받은 시간표 그림을 읽는다.
 *
 * 글자를 다 읽으려 들지 않는다. 요일은 칸의 가로 자리, 시각은 세로 자리에
 * 적혀 있어서, 글자로 알아내야 하는 건 강의실 코드 하나뿐이다.
 *
 * 과목 이름은 아예 안 가져온다. 인식이 절반쯤밖에 안 맞아 「창업아이디어설계」가
 * 「창」으로 들어왔는데, 길찾기에 쓰이지도 않는 값을 그렇게 어설프게 들고 있으면
 * 화면만 지저분해진다. 큰 언어 데이터(6.6MB)로도 정확도가 그대로여서 — 재 봤다 —
 * 더 받아서 될 일도 아니었다. 어디로 가느냐는 강의실 하나로 정해진다.
 *
 * 읽은 값은 그대로 쓰지 않는다. 확인 화면에서 사람이 보고 고친 뒤에야 시간표가
 * 된다. 그래서 여기서는 '확실하지 않다' 를 숨기지 않고 같이 넘긴다.
 */

export interface ParsedSlot {
  day: Weekday;
  startMinutes: number;
  endMinutes: number;
  /** 읽어 낸 강의실. 못 읽었으면 빈 문자열 — 확인 화면에서 채운다. */
  room: string;
  /** 강의실을 얼마나 믿을 수 있는지(0~100). 낮으면 확인 화면에서 먼저 보여 준다. */
  confidence: number;
}

export interface ParseResult {
  slots: ParsedSlot[];
  /** 사람이 알아야 할 것. 못 읽은 칸, 못 찾은 시간축 같은 것. */
  warnings: string[];
}

/**
 * 아무것도 없는 흰 바탕인지.
 *
 * 처음에는 '옅고 채도가 낮으면 글자나 눈금선' 으로 걸렀다. 그랬더니 옅은
 * 회분홍(#f7f2f2 같은) 수업 칸이 통째로 버려졌다 — 채도로는 옅은 칸과 회색
 * 선을 가를 수 없다. 실제로 기초확률 한 칸이 그렇게 사라졌다.
 *
 * 그래서 흰색만 바탕으로 본다. 눈금선도 글자도 '바탕이 아닌 것' 으로 함께
 * 걸리지만, 선은 한두 픽셀이라 높이로 걸러지고, 글자는 칸 안에 있으니 같은
 * 칸으로 이어 붙으면 그만이다.
 */
const isPaper = (r: number, g: number, b: number) =>
  r > 249 && g > 249 && b > 249;

/** 글자인지. 칸 색을 견줄 때 글자 픽셀에 속지 않으려고 쓴다. */
const isGlyph = (r: number, g: number, b: number) => (r + g + b) / 3 < 170;

/** 두 색이 눈에 띄게 다른지. 맞붙은 칸을 가르는 데 쓴다. */
const differs = (a: number[], b: number[]) =>
  Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) > 24;

interface Run {
  top: number;
  bottom: number;
}

/**
 * 한 요일 칸을 위에서 아래로 훑어 색이 칠해진 구간을 찾는다.
 *
 * 칸 하나하나를 도형으로 찾아내는 대신, 칸 가운데를 지나는 세로줄 하나만 본다.
 * 에브리타임의 수업 칸은 요일 칸 폭을 꽉 채우므로 이 한 줄이면 위아래 끝을
 * 정확히 알 수 있다. 훨씬 싸고, 모서리가 둥글거나 테두리가 있어도 안 흔들린다.
 */
const runsInColumn = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  minHeight: number,
): Run[] => {
  const runs: Run[] = [];
  let start = -1;
  let colour: number[] | null = null;

  const close = (end: number) => {
    if (start >= 0 && end - start >= minHeight)
      runs.push({ top: start, bottom: end });
    start = -1;
    colour = null;
  };

  for (let y = 0; y < height; y += 1) {
    const i = (y * width + x) * 4;
    const px = [data[i], data[i + 1], data[i + 2]];

    if (isPaper(px[0], px[1], px[2])) {
      close(y);
      continue;
    }
    if (start < 0) {
      start = y;
      colour = isGlyph(px[0], px[1], px[2]) ? null : px;
      continue;
    }
    /* 칸 색은 글자가 아닌 자리에서만 잡는다. 글자 위에서 잡으면 늘 어긋난다. */
    if (isGlyph(px[0], px[1], px[2])) continue;
    if (!colour) {
      colour = px;
      continue;
    }
    /* 색이 확 바뀌면 다른 수업이 맞붙은 것이다. 사이에 흰 틈이 없을 수 있다. */
    if (differs(colour, px)) {
      close(y);
      start = y;
      colour = px;
    }
  }
  close(height);
  return runs;
};

/**
 * 세로 자리를 시각으로 옮기는 자.
 *
 * 왼쪽에 적힌 '9시·10시…' 를 글자로 읽되, 전부 읽힐 거라고 믿지 않는다 —
 * 실제로 `11시` 가 `기시` 로, `12시` 가 `1241` 로 읽히는 걸 봤다. 잘 읽힌 것만
 * 골라 직선을 맞춘다. 두 개만 성해도 자가 선다.
 */
export interface TimeAxis {
  /** y = originY 일 때의 분. */
  originMinutes: number;
  /** 1픽셀이 몇 분인지. */
  minutesPerPixel: number;
  originY: number;
}

export const fitTimeAxis = (
  marks: { hour: number; y: number }[],
): TimeAxis | null => {
  if (marks.length < 2) return null;

  /* 가장 멀리 떨어진 두 점을 쓴다. 지렛대가 길수록 눈금이 정확하다. */
  const sorted = [...marks].sort((a, b) => a.y - b.y);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (last.y === first.y || last.hour === first.hour) return null;

  const minutesPerPixel = ((last.hour - first.hour) * 60) / (last.y - first.y);
  /* 한 시간 칸이 20~200px 을 벗어나면 시간표를 잘못 읽은 것이다. */
  const pitch = 60 / minutesPerPixel;
  if (pitch < 20 || pitch > 200) return null;

  /*
   * 라벨이 가리키는 자리와 그 시각이 시작하는 자리는 다르다.
   *
   * `9시` 는 9시 칸 **가운데**에 놓이지만, 9시에 시작하는 수업은 칸 **위**에서
   * 시작한다. 라벨 자리를 그대로 9시로 읽으면 시간표 전체가 반 칸(30분) 밀린다.
   * 그래서 기준을 반 칸 위로 올린다.
   *
   * 이걸 '30분 빼기' 로 뭉뚱그리면 안 된다. 칸 하나가 한 시간이 아닌 시간표에서
   * 또 어긋난다. 반 칸은 눈금에서 바로 나온다.
   */
  return {
    originMinutes: first.hour * 60,
    originY: first.y - pitch / 2,
    minutesPerPixel,
  };
};

export const minutesAt = (axis: TimeAxis, y: number): number =>
  axis.originMinutes + (y - axis.originY) * axis.minutesPerPixel;

/**
 * 정각으로 맞춘다.
 *
 * 수업은 교시로 돌아간다 — 1교시 9시, 6교시 14시. 그림에서 잰 값은 몇 분씩
 * 어긋나기 마련인데, 실제 시각이 늘 정각이라는 걸 알고 있으니 그 잔떨림을
 * 들고 다닐 이유가 없다. 08:47 이든 09:12 든 답은 09:00 이다.
 */
export const HOUR = 60;

export const snap = (minutes: number, step = HOUR): number =>
  Math.round(minutes / step) * step;

export { runsInColumn, isPaper, isGlyph };

/* ── 글자 읽기 ────────────────────────────────────────────────────────── */

interface Word {
  text: string;
  confidence: number;
  x: number;
  y: number;
  right: number;
  bottom: number;
}

/**
 * 인식기 부속의 자리.
 *
 * 우리 쪽에서 내보낸다(`scripts/copy-ocr.mjs`). 남의 CDN 을 그대로 두면 아예
 * 안 돈다 — 브라우저는 다른 출처의 스크립트로 Worker 를 못 만들어서, 진행률
 * 콜백조차 안 불린 채 조용히 멈춰 있었다. 우리 쪽에 두면 그 문제도 없고,
 * 신호가 죽어도 서비스 워커가 들고 있던 것으로 돈다.
 */
const OCR_ASSETS = {
  workerPath: '/ocr/worker.min.js',
  corePath: '/ocr',
  langPath: '/ocr',
} as const;

/**
 * 한국어 하나만 싣는다.
 *
 * 영어까지 실으면 13MB 가 더 붙는데, 재 보니 한국어만으로 요일·시각·강의실이
 * 다 읽힌다. 칸을 떼어 키워 넘기면 하이픈까지 그대로 온다. 그래도 작은 그림에서
 * `7-615` 가 `7615` 로 오는 일은 남는데, 그건 `room.ts` 의 되살리기가 잡는다.
 */
const OCR_LANGS = ['kor'];

interface Reader {
  read: (canvas: HTMLCanvasElement) => Promise<Word[]>;
  close: () => Promise<void>;
}

/**
 * 글자 인식기는 쓸 때만 불러오고, 한 번 세워 여러 번 쓴다.
 *
 * 4MB 가까이 되는 짐이라 첫 화면에 끼워 두면 안 된다. 시간표를 올리는 사람만,
 * 올리는 그 순간에 받는다. 한 번 받으면 브라우저가 들고 있는다.
 *
 * 세우고 무너뜨리는 일이 읽는 일보다 비싸다. 아래에서 그림 한 장을 수십 번
 * 나눠 읽으므로, 인식기를 밖에 두고 돌려 쓴다.
 *
 * 읽는 동안의 진행률은 여기서 넘기지 않는다. 조각마다 0% 로 되감겨서, 그대로
 * 내보내면 화면의 숫자가 왔다 갔다 한다. 몇 조각 중 몇째인지는 부르는 쪽이
 * 알고 있으니 그쪽이 말한다. 여기서는 부속 내려받는 소식만 넘긴다.
 */
const openReader = async (
  onProgress?: (ratio: number, what: string) => void,
): Promise<Reader> => {
  /*
   * tesseract 는 CommonJS 라, 번들러를 거치면 알맹이가 default 밑으로 들어간다.
   * 둘 다 받아 준다 — 한쪽만 보고 있다가는 조용히 멈춘다.
   */
  const mod = await import('tesseract.js');
  const createWorker =
    mod.createWorker ??
    (mod as unknown as { default: typeof mod }).default.createWorker;

  const worker = await createWorker(OCR_LANGS, 1, {
    ...OCR_ASSETS,
    logger: (m: { status: string; progress: number }) => {
      if (m.status !== 'recognizing text') onProgress?.(m.progress, m.status);
    },
  });

  const read = async (canvas: HTMLCanvasElement): Promise<Word[]> => {
    const { data } = await worker.recognize(canvas, {}, { blocks: true });
    const words: Word[] = [];
    for (const block of data.blocks ?? [])
      for (const para of block.paragraphs ?? [])
        for (const line of para.lines ?? [])
          for (const word of line.words ?? [])
            words.push({
              text: word.text.trim(),
              confidence: word.confidence,
              x: word.bbox.x0,
              y: word.bbox.y0,
              right: word.bbox.x1,
              bottom: word.bbox.y1,
            });
    return words;
  };

  return {
    read,
    close: async () => {
      await worker.terminate();
    },
  };
};

const DAY_HEADS = ['월', '화', '수', '목', '금'];

/**
 * 수업 칸 하나를 따로 떼어 그린다.
 *
 * 인식기에 한 칸씩 건네려고 만든다. 왜 나눠 주는지는 `parseTimetableImage` 에 적었다.
 *
 * 두 가지를 같이 한다. 하나는 키우기 — 에브리타임이 내보낸 그림에서 강의실
 * 글자는 15px 밖에 안 되는데, 인식기는 그 두 배는 되어야 제대로 읽는다.
 * 칸 너비를 재서 필요한 만큼만 키운다. 이미 큰 그림을 또 키워 봐야 느리기만
 * 하다.
 *
 * 둘은 흰 여백 두르기 — 글자가 조각 가장자리에 닿아 있으면 인식기가 통째로
 * 흘린다. 옆 칸 세로줄도 이 여백에 밀려 함께 빠진다.
 */
const CROP_WIDTH = 360;
const CROP_MARGIN = 16;
/** 칸 양옆의 세로 눈금선은 빼고 자른다. 글자로 읽힌다. */
const CROP_INSET = 2;

const cropBlock = (
  source: HTMLCanvasElement,
  left: number,
  top: number,
  right: number,
  bottom: number,
): HTMLCanvasElement | null => {
  const x = Math.max(0, Math.round(left) + CROP_INSET);
  const y = Math.max(0, Math.round(top));
  const width = Math.min(source.width, Math.round(right) - CROP_INSET) - x;
  const height = Math.min(source.height, Math.round(bottom)) - y;
  if (width < 1 || height < 1) return null;

  const scale = Math.min(4, Math.max(1, CROP_WIDTH / width));
  const crop = document.createElement('canvas');
  crop.width = Math.round(width * scale) + CROP_MARGIN * 2;
  crop.height = Math.round(height * scale) + CROP_MARGIN * 2;

  const ctx = crop.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, crop.width, crop.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    source,
    x,
    y,
    width,
    height,
    CROP_MARGIN,
    CROP_MARGIN,
    crop.width - CROP_MARGIN * 2,
    crop.height - CROP_MARGIN * 2,
  );
  return crop;
};

/**
 * 잘라 낸 칸 하나에서 강의실을 고른다.
 *
 * 칸 안에 강의실처럼 생긴 낱말이 여럿일 수 있다. 과목명이나 교수 이름이 뭉개져
 * 숫자로 읽히면 그게 먼저 걸린다 — `ICT융합개론` 은 늘 `107` 로 온다. 그래서
 * 먼저 온 것을 집지 않고, **캠퍼스에 실제로 있는 건물 번호로 풀리는 것**을
 * 고른다. 그런 게 여럿이면 아래쪽을 고른다 — 강의실은 칸의 마지막 줄에 적힌다.
 */
const roomInBlock = (
  words: Word[],
  knownBuildings: Set<number>,
): { room: string; confidence: number } => {
  const candidates = words.filter((w) => looksLikeRoomCode(w.text));
  const resolves = (w: Word) => {
    const no = buildingNoOf(repairRoom(w.text, knownBuildings));
    return no !== null && knownBuildings.has(no);
  };
  const good = candidates.filter(resolves);
  const pool = good.length > 0 ? good : candidates;
  const pick = pool.reduce<Word | undefined>(
    (best, w) => (!best || w.bottom > best.bottom ? w : best),
    undefined,
  );
  return pick
    ? {
        room: repairRoom(pick.text, knownBuildings),
        confidence: pick.confidence,
      }
    : { room: '', confidence: 0 };
};

interface Layout {
  /** 요일 칸 다섯의 가운데 가로 자리. */
  columns: number[];
  /** 요일 칸 너비. */
  pitch: number;
  axis: TimeAxis;
  /** 이보다 낮은 자국은 칸이 아니다. */
  minHeight: number;
}

/**
 * 그림에서 격자를 읽어 낸다 — 요일 칸이 어디고, 세로 어디가 몇 시인지.
 *
 * 사람이 알아야 할 만큼 잘못됐으면 할 말을 글로 돌려준다.
 */
const readLayout = (
  canvas: HTMLCanvasElement,
  words: Word[],
): Layout | string => {
  /* 요일 머리글의 가로 자리가 곧 요일 칸의 자리다. */
  const heads = DAY_HEADS.map((label) => {
    const hit = words.find(
      (w) => w.text === label && w.y < canvas.height * 0.15,
    );
    return hit ? (hit.x + hit.right) / 2 : null;
  });
  if (heads.filter((x) => x !== null).length < 2)
    return '요일 줄을 못 찾았습니다. 시간표 전체가 나온 그림인지 확인해 주세요.';

  /* 못 읽은 요일은 읽힌 것들의 간격으로 메운다. 칸 너비는 일정하다. */
  const firstIndex = heads.findIndex((x) => x !== null);
  const lastIndex =
    heads.length - 1 - [...heads].reverse().findIndex((x) => x !== null);
  const pitch =
    (heads[lastIndex]! - heads[firstIndex]!) / (lastIndex - firstIndex);
  const columns = heads.map((x, i) =>
    x !== null ? x : heads[firstIndex]! + (i - firstIndex) * pitch,
  );

  /* 왼쪽 시각 눈금. 전부 읽히지 않아도 두 개면 자가 선다. */
  const leftEdge = columns[0] - pitch / 2;
  const marks: { hour: number; y: number }[] = [];
  for (const w of words) {
    if (w.right > leftEdge) continue;
    const hour = Number(/^(\d{1,2})\s*시?$/.exec(w.text)?.[1]);
    if (!Number.isFinite(hour) || hour < 0 || hour > 23) continue;
    if (w.confidence < 60) continue;
    marks.push({ hour, y: (w.y + w.bottom) / 2 });
  }
  const axis = fitTimeAxis(marks);
  if (!axis)
    return '왼쪽 시각 눈금을 못 읽었습니다. 시간이 함께 나온 그림이어야 합니다.';

  /*
   * 흰색만 바탕으로 보게 되면서 한두 픽셀짜리 눈금선까지 걸리는데, 한 교시의
   * 삼분의 일도 안 되는 높이는 수업 칸일 수 없다.
   */
  const minHeight = Math.max(4, Math.round(HOUR / axis.minutesPerPixel / 3));

  return { columns, pitch, axis, minHeight };
};

/* ── 전체 ─────────────────────────────────────────────────────────────── */

/**
 * 고른 파일 그대로 받는다.
 *
 * `<img>` 에 실어 `decode()` 를 기다리는 길도 있지만, 그쪽은 사진이 안 오면
 * 영영 안 끝나는 수가 있다 — 실제로 그렇게 멈춰 봤다. `createImageBitmap` 은
 * 못 읽으면 못 읽는다고 바로 말한다.
 */
export const parseTimetableImage = async (
  file: Blob,
  knownBuildings: Set<number>,
  onProgress?: (ratio: number, what: string) => void,
): Promise<ParseResult> => {
  const warnings: string[] = [];

  let image: ImageBitmap;
  try {
    image = await createImageBitmap(file);
  } catch {
    return {
      slots: [],
      warnings: ['그림을 못 읽었습니다. PNG 나 JPG 인지 확인해 주세요.'],
    };
  }

  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx)
    return { slots: [], warnings: ['이 브라우저에서는 그림을 못 읽습니다.'] };
  ctx.drawImage(image, 0, 0);
  image.close();

  const reader = await openReader(onProgress);
  try {
    /*
     * 처음 한 번은 그림 전체를 읽는다. 여기서 얻는 건 격자뿐이다 — 요일 머리글과
     * 왼쪽 시각 눈금. 둘 다 흰 바탕에 놓인 짧은 글자라 이 한 번으로 잘 읽힌다.
     */
    onProgress?.(0, 'recognizing text');
    const layout = readLayout(canvas, await reader.read(canvas));
    if (typeof layout === 'string') return { slots: [], warnings: [layout] };
    const { columns, pitch, axis, minHeight } = layout;

    /* 색칠된 칸을 먼저 다 찾아 둔다. 몇 조각인지 알아야 진행률을 말할 수 있다. */
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const found: { day: Weekday; centre: number; run: Run }[] = [];
    for (let day = 0; day < 5; day += 1) {
      const centre = Math.round(columns[day]);
      for (const run of runsInColumn(
        data,
        canvas.width,
        canvas.height,
        centre,
        minHeight,
      )) {
        /* 한 교시의 절반도 안 되는 자국은 칸이 아니라 눈금이나 그림자다. */
        if (minutesAt(axis, run.bottom) - minutesAt(axis, run.top) < HOUR / 2)
          continue;
        found.push({ day: day as Weekday, centre, run });
      }
    }

    /*
     * 강의실은 칸을 하나씩 떼어 읽는다.
     *
     * 한 장을 통째로 넘기던 때는 열에 아홉을 놓쳤다. 인식기의 판면 분석이
     * 색칠된 격자를 문서로 못 보기 때문이다 — 재 보니 `ICT융합개론` 칸이
     * 통째로 확신 0 짜리 낱말 하나로 뭉개져 나왔다. 자리를 이미 알고 있는데
     * 그걸 인식기에게 다시 찾아내라고 시킬 이유가 없다.
     *
     * 960px 짜리 시간표 하나로 재 봤다. 통째로 넘기면 11칸 중 2칸, 그나마
     * 하이픈이 빠진 `7615`. 칸마다 떼어 키워 넘기면 11칸 전부, 확신 88~91 에
     * 하이픈까지 그대로. 조각이 작아 열한 번 읽는 데 270ms 면 된다.
     */
    const slots: ParsedSlot[] = [];
    for (const [i, { day, centre, run }] of found.entries()) {
      onProgress?.((i + 1) / (found.length + 1), 'recognizing text');

      const startMinutes = snap(minutesAt(axis, run.top));
      const crop = cropBlock(
        canvas,
        centre - pitch / 2,
        run.top,
        centre + pitch / 2,
        run.bottom,
      );
      slots.push({
        day,
        startMinutes,
        /* 정각으로 맞추다 보면 한 교시짜리가 0분으로 눌린다. 최소 한 시간은 준다. */
        endMinutes: Math.max(
          snap(minutesAt(axis, run.bottom)),
          startMinutes + HOUR,
        ),
        ...(crop
          ? roomInBlock(await reader.read(crop), knownBuildings)
          : { room: '', confidence: 0 }),
      });
    }
    onProgress?.(1, 'recognizing text');

    /*
     * 못 읽은 칸이 몇인지는 여기서 말하지 않는다.
     *
     * 확인 화면이 지금 값을 보고 세고 있어서, 사람이 고친 뒤에도 여기서 만든 말이
     * 남아 있으면 '고쳤는데 아직 못 읽었다' 는 거짓말이 된다. 그 몫은 화면에
     * 맡기고, 여기서는 그림 자체가 잘못됐을 때만 말한다.
     */
    if (slots.length === 0)
      warnings.push(
        '수업 칸을 하나도 못 찾았습니다. 잘리지 않은 시간표 그림인지 확인해 주세요.',
      );

    return { slots, warnings };
  } finally {
    await reader.close();
  }
};
