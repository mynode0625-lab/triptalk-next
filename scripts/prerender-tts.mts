/**
 * 연습실 대사를 미리 오디오 파일로 굽는다.
 *
 * 연습실 대본은 `scenarios.ts` 에 고정돼 있다. 말할 문장이 미리 정해져 있는데
 * 방문자마다 매번 OpenAI 를 부르면, 같은 문장을 같은 목소리로 다시 만들면서
 * 돈만 나간다. 한 번 구워서 `public/tts/` 에 두면 런타임 호출이 0 이 되고,
 * 심사 기간에 트래픽이 몰려도 청구액이 늘지 않는다.
 *
 * 굽는 대상 (세 갈래 모두 연습실에서 실제로 재생된다)
 *   1. `turns[].ai`        — 캐릭터 대사. 자동 재생·다시 듣기
 *   2. `turns[].models[][0]` — 모범 답안. 섀도잉 모드에서 캐릭터 목소리로 읽어준다
 *   3. `SAMPLE`            — 설정 화면의 음성 테스트 한 문장
 *
 * 실행
 *   node --env-file=.env.local scripts/prerender-tts.ts --dry-run   # 목록·개수만
 *   node --env-file=.env.local scripts/prerender-tts.ts             # 실제 생성
 *
 * 이미 있는 파일은 건너뛴다. 중간에 끊겨도 다시 돌리면 남은 것만 채우므로
 * 같은 문장에 두 번 과금되지 않는다.
 */
import { createHash } from "node:crypto";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { SCENES } from "../src/lib/data/scenarios.ts";

/** `PracticeApp` 의 SAMPLE 과 같은 문장이어야 한다. 바뀌면 여기도 맞춘다. */
const SAMPLE = "Good morning! Where are you flying to today?";

/** `api/tts/route.ts` 의 기본값과 같아야 프리렌더 결과가 서버 응답과 일치한다. */
const DEFAULT_VOICE = "nova";
const DEFAULT_INSTRUCTIONS =
  "Speak natural, conversational American English — the relaxed rhythm of a real person " +
  "talking, with connected speech and normal contractions. Never robotic or word-by-word.";

const OUT_DIR = join(import.meta.dirname, "..", "public", "tts");
const MANIFEST = join(OUT_DIR, "manifest.json");

/** 동시 호출 수. 올리면 빨라지지만 429 를 맞기 쉬워진다. */
const CONCURRENCY = 4;
const MAX_RETRIES = 4;

type Job = {
  /** 매니페스트 조회 키 — 런타임 `engine.ts` 가 같은 규칙으로 만든다 */
  key: string;
  text: string;
  voice: string;
  instructions: string;
  file: string;
  /** 어디서 온 문장인지 — 로그와 충돌 진단에만 쓴다 */
  origin: string;
};

/**
 * 조회 키는 (음성, 문장) 쌍이다. `inst` 까지 넣으면 정확하지만 매니페스트가
 * 네 배로 커진다. 같은 음성·같은 문장인데 톤 지시문만 다른 경우는 아래에서
 * 충돌로 잡아 알려준다.
 */
const keyOf = (voice: string, text: string) => `${voice}|${text}`;

const fileOf = (voice: string, instructions: string, text: string) =>
  createHash("sha256").update(`${voice}|${instructions}|${text}`).digest("hex").slice(0, 16) + ".mp3";

function collectJobs(): Job[] {
  const jobs = new Map<string, Job>();
  const conflicts: string[] = [];

  const add = (text: string, voice: string, instructions: string, origin: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const key = keyOf(voice, trimmed);
    const existing = jobs.get(key);
    if (existing) {
      // 같은 음성·문장인데 톤 지시문이 다르면 먼저 등록된 쪽을 쓴다.
      // 어느 쪽으로 구워도 들리는 차이는 작지만, 조용히 넘어가면 나중에
      // "왜 이 대사만 톤이 다르지" 를 추적할 수 없으니 남긴다.
      if (existing.instructions !== instructions) {
        conflicts.push(`${origin} ↔ ${existing.origin} — "${trimmed.slice(0, 40)}…"`);
      }
      return;
    }
    jobs.set(key, {
      key, text: trimmed, voice, instructions,
      file: fileOf(voice, instructions, trimmed),
      origin
    });
  };

  for (const [sceneKey, scene] of Object.entries(SCENES)) {
    const voice = scene.char.voice.oa || DEFAULT_VOICE;
    const inst = scene.char.voice.inst || DEFAULT_INSTRUCTIONS;

    scene.turns.forEach((turn, i) => {
      add(turn.ai, voice, inst, `${sceneKey}.turns[${i}].ai`);
      // 섀도잉은 profile 을 넘기지 않아 캐릭터 목소리로 읽힌다 (PracticeApp:480)
      turn.models.forEach(([english], m) => {
        add(english, voice, inst, `${sceneKey}.turns[${i}].models[${m}]`);
      });
    });
  }

  // 설정 화면 음성 테스트는 `profile: {}` 로 불려서 기본 음성을 탄다 (PracticeApp:495)
  add(SAMPLE, DEFAULT_VOICE, DEFAULT_INSTRUCTIONS, "SAMPLE");

  if (conflicts.length) {
    console.warn(`\n⚠ 같은 음성·문장에 톤 지시문이 둘 (${conflicts.length}건) — 먼저 등록된 쪽을 씁니다.`);
    conflicts.slice(0, 5).forEach(c => console.warn(`   ${c}`));
    if (conflicts.length > 5) console.warn(`   … 외 ${conflicts.length - 5}건`);
  }

  return [...jobs.values()];
}

async function synthesize(job: Job, apiKey: string): Promise<Buffer> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: job.voice,
        input: job.text,
        instructions: job.instructions,
        response_format: "mp3"
      })
    });

    if (res.ok) return Buffer.from(await res.arrayBuffer());

    const detail = (await res.text()).slice(0, 300);

    // 크레딧이 없거나 키가 틀린 건 기다린다고 풀리지 않는다. 즉시 세운다.
    if (res.status === 401 || res.status === 403) {
      throw new Error(`인증 실패 (${res.status}) — 키를 확인하세요.\n${detail}`);
    }
    if (res.status === 429 && detail.includes("insufficient_quota")) {
      throw new Error(`크레딧이 없습니다.\n${detail}`);
    }
    if (attempt > MAX_RETRIES) throw new Error(`${res.status} — ${detail}`);

    const wait = 2 ** attempt * 500;
    console.warn(`   ↻ ${res.status} — ${wait}ms 후 재시도 (${attempt}/${MAX_RETRIES})`);
    await new Promise(r => setTimeout(r, wait));
  }
}

/** `--limit 1` — 254개를 돌리기 전에 몇 개만 실제로 만들어 보기 위한 안전핀. */
function limitArg(): number {
  const i = process.argv.indexOf("--limit");
  if (i === -1) return Infinity;
  const n = Number(process.argv[i + 1]);
  if (!Number.isInteger(n) || n < 1) {
    console.error("--limit 뒤에는 1 이상의 정수가 와야 합니다.");
    process.exit(1);
  }
  return n;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const limit = limitArg();
  const jobs = collectJobs();

  await mkdir(OUT_DIR, { recursive: true });
  const existing = new Set(await readdir(OUT_DIR).catch(() => [] as string[]));
  const pending = jobs.filter(j => !existing.has(j.file));
  const todo = pending.slice(0, limit === Infinity ? pending.length : limit);

  const chars = jobs.reduce((n, j) => n + j.text.length, 0);
  const todoChars = todo.reduce((n, j) => n + j.text.length, 0);

  console.log(`\n대상 ${jobs.length}개 · ${chars.toLocaleString()}자`);
  console.log(`이미 있음 ${jobs.length - pending.length}개 · 남은 것 ${pending.length}개`);
  console.log(`이번에 생성 ${todo.length}개 · ${todoChars.toLocaleString()}자` +
    (todo.length < pending.length ? `  (--limit ${limit} 적용, ${pending.length - todo.length}개는 다음 실행으로)` : ""));

  if (dryRun) {
    console.log("\n--dry-run — 실제 호출 없음. 앞 5개:");
    todo.slice(0, 5).forEach(j => console.log(`   [${j.voice}] ${j.origin}\n      "${j.text.slice(0, 60)}…" → ${j.file}`));
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("\nOPENAI_API_KEY 가 없습니다. `node --env-file=.env.local …` 로 실행하세요.");
    process.exit(1);
  }

  let done = 0;
  let failed = 0;
  const queue = [...todo];

  const worker = async () => {
    for (let job = queue.shift(); job; job = queue.shift()) {
      try {
        const audio = await synthesize(job, apiKey);
        await writeFile(join(OUT_DIR, job.file), audio);
        done++;
        console.log(`   ${done + failed}/${todo.length}  ${job.origin}`);
      } catch (e) {
        // 인증·크레딧 문제는 전부 똑같이 실패한다. 253번 반복해봐야 의미가 없다.
        const msg = (e as Error).message;
        if (msg.includes("인증 실패") || msg.includes("크레딧")) {
          queue.length = 0;
          throw e;
        }
        failed++;
        console.error(`   ✗ ${job.origin} — ${msg}`);
      }
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // 매니페스트는 실제로 파일이 있는 것만 담는다. 없는 파일을 가리키면
  // 런타임이 404 를 받고 내장 음성으로 떨어지므로, 차라리 빼는 게 낫다.
  const present = new Set(await readdir(OUT_DIR));
  const manifest: Record<string, string> = {};
  for (const job of jobs) if (present.has(job.file)) manifest[job.key] = job.file;

  await writeFile(MANIFEST, JSON.stringify(manifest, null, 0) + "\n");

  console.log(`\n생성 ${done}개 · 실패 ${failed}개`);
  console.log(`매니페스트 ${Object.keys(manifest).length}/${jobs.length}개 → public/tts/manifest.json`);
  if (Object.keys(manifest).length < jobs.length) {
    console.log("아직 다 굽지 않았습니다. 없는 대사는 런타임에 서버 TTS·내장 음성으로 넘어갑니다.");
  }
  if (failed) process.exitCode = 1;
}

await main();
