import type { Weekday } from '@/types/timetable';
import { repairRoom } from './room';

/**
 * 에브리타임에서 내려받은 시간표 그림을 읽는다.
 *
 * 글자를 다 읽으려 들지 않는다. 요일은 칸의 가로 자리, 시각은 세로 자리에
 * 적혀 있어서, 글자로 알아내야 하는 건 강의실 코드 하나뿐이다. 과목 이름은
 * 있으면 얹고 없으면 만다 — 길찾기에는 없어도 된다.
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
  title: string;
  /** 강의실을 얼마나 믿을 수 있는지(0~100). 낮으면 확인 화면에서 먼저 보여 준다. */
  confidence: number;
}

export interface ParseResult {
  slots: ParsedSlot[];
  /** 사람이 알아야 할 것. 못 읽은 칸, 못 찾은 시간축 같은 것. */
  warnings: string[];
}

/** 흰 바탕인지. 칸의 배경은 옅어도 흰색은 아니다. */
const isBackdrop = (r: number, g: number, b: number) =>
  r > 248 && g > 248 && b > 248;

/** 글자나 눈금선인지. 회색 계열이고 어둡다. */
const isInk = (r: number, g: number, b: number) => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max - min < 6 && max < 250;
};

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
    const filled =
      !isBackdrop(px[0], px[1], px[2]) && !isInk(px[0], px[1], px[2]);

    if (!filled) {
      close(y);
      continue;
    }
    if (start < 0) {
      start = y;
      colour = px;
      continue;
    }
    /* 색이 확 바뀌면 다른 수업이 맞붙은 것이다. 사이에 흰 틈이 없을 수 있다. */
    if (colour && differs(colour, px)) {
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

export { runsInColumn, isBackdrop, isInk };

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
 * 다 읽힌다. 하이픈이 자주 빠져 `7-615` 가 `7615` 로 오지만 그건 `room.ts` 의
 * 되살리기가 잡는다.
 */
const OCR_LANGS = ['kor'];

/**
 * 글자 인식기는 쓸 때만 불러온다.
 *
 * 4MB 가까이 되는 짐이라 첫 화면에 끼워 두면 안 된다. 시간표를 올리는 사람만,
 * 올리는 그 순간에 받는다. 한 번 받으면 브라우저가 들고 있는다.
 */
const readWords = async (
  canvas: HTMLCanvasElement,
  onProgress?: (ratio: number, what: string) => void,
): Promise<Word[]> => {
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
    logger: (m: { status: string; progress: number }) =>
      onProgress?.(m.progress, m.status),
  });
  try {
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
  } finally {
    await worker.terminate();
  }
};

const DAY_HEADS = ['월', '화', '수', '목', '금'];

/** 강의실처럼 생긴 낱말. 하이픈이 빠져 붙어 온 것도 받는다. */
const ROOM_LIKE = /^\d{1,2}\s*[-–—−]?\s*[A-Za-z]?\d{2,4}$/;

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

  const words = await readWords(canvas, onProgress);

  /* 요일 머리글의 가로 자리가 곧 요일 칸의 자리다. */
  const heads = DAY_HEADS.map((label) => {
    const hit = words.find(
      (w) => w.text === label && w.y < canvas.height * 0.15,
    );
    return hit ? (hit.x + hit.right) / 2 : null;
  });
  const known = heads.filter((x): x is number => x !== null);
  if (known.length < 2) {
    return {
      slots: [],
      warnings: [
        '요일 줄을 못 찾았습니다. 시간표 전체가 나온 그림인지 확인해 주세요.',
      ],
    };
  }

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
  if (!axis) {
    return {
      slots: [],
      warnings: [
        '왼쪽 시각 눈금을 못 읽었습니다. 시간이 함께 나온 그림이어야 합니다.',
      ],
    };
  }

  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const minHeight = Math.max(8, Math.round(20 / axis.minutesPerPixel / 4));

  const slots: ParsedSlot[] = [];
  let roomless = 0;

  for (let day = 0; day < 5; day += 1) {
    const centre = Math.round(columns[day]);
    for (const run of runsInColumn(
      data,
      canvas.width,
      canvas.height,
      centre,
      minHeight,
    )) {
      const startMinutes = snap(minutesAt(axis, run.top));
      /* 정각으로 맞추다 보면 한 교시짜리가 0분으로 눌린다. 최소 한 시간은 준다. */
      const endMinutes = Math.max(
        snap(minutesAt(axis, run.bottom)),
        startMinutes + HOUR,
      );
      /* 한 교시의 절반도 안 되는 자국은 칸이 아니라 눈금이나 그림자다. */
      if (minutesAt(axis, run.bottom) - minutesAt(axis, run.top) < HOUR / 2)
        continue;

      /*
       * 낱말이 이 칸에 속하는지는 낱말의 가운데로 본다. 네 귀퉁이가 다 들어와야
       * 한다고 하면, 칸 가장자리에 바싹 붙은 글자를 통째로 놓친다.
       */
      const inside = words.filter((w) => {
        const cx = (w.x + w.right) / 2;
        const cy = (w.y + w.bottom) / 2;
        return (
          Math.abs(cx - centre) < pitch / 2 &&
          cy >= run.top - 4 &&
          cy <= run.bottom + 4
        );
      });

      const roomWord = inside.find((w) => ROOM_LIKE.test(w.text));
      if (!roomWord) roomless += 1;

      /* 첫 줄이 과목 이름이다. 같은 높이의 낱말을 이어 붙인다. */
      const top = inside.length > 0 ? Math.min(...inside.map((w) => w.y)) : 0;
      const title = inside
        .filter((w) => w.y < top + 12 && w !== roomWord)
        .map((w) => w.text)
        .join('');

      slots.push({
        day: day as Weekday,
        startMinutes,
        endMinutes,
        room: roomWord ? repairRoom(roomWord.text, knownBuildings) : '',
        title,
        confidence: roomWord ? roomWord.confidence : 0,
      });
    }
  }

  if (slots.length === 0)
    warnings.push(
      '수업 칸을 하나도 못 찾았습니다. 잘리지 않은 시간표 그림인지 확인해 주세요.',
    );
  else if (roomless > 0)
    warnings.push(`${roomless}칸은 강의실을 못 읽었습니다. 직접 넣어 주세요.`);

  return { slots, warnings };
};
