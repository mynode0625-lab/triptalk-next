/** 발음 교정 사전 (한국인 화자 취약 지점) — practice.js §2 */

/** 묵음이 들어가는 단어 */
export const SILENT: Record<string, string> = {
  aisle: "s는 소리 나지 않습니다 — [아일]", receipt: "p는 묵음 — [리씻]",
  wednesday: "d는 묵음 — [웬즈데이]", comfortable: "[컴f터블] 3음절로 줄여서",
  vegetable: "[베지터블] — 가운데 e가 사라집니다", island: "s는 묵음 — [아일런드]",
  hour: "h는 묵음 — [아워]", half: "l은 묵음 — [해f]", walk: "l은 묵음 — [웍]",
  talk: "l은 묵음 — [톡]", listen: "t는 묵음 — [리슨]", castle: "t는 묵음 — [캐슬]",
  knife: "k는 묵음 — [나이f]", answer: "w는 묵음 — [앤써]", often: "t는 보통 묵음 — [오픈]",
  salmon: "l은 묵음 — [쌔먼]", could: "l은 묵음 — [쿠d]", would: "l은 묵음 — [우d]",
  should: "l은 묵음 — [슈d]"
};

/** 강세 위치가 헷갈리는 단어 */
export const STRESS: Record<string, string> = {
  reservation: "re-ser-VA-tion — 세 번째 음절에 강세",
  hotel: "ho-TEL — 뒤에 강세 (앞에 주면 다르게 들립니다)",
  passport: "PASS-port — 앞에 강세",
  luggage: "LUG-gage — 앞에 강세, [러기지]",
  baggage: "BAG-gage — 앞에 강세",
  available: "a-VAIL-a-ble — 두 번째 음절",
  allergic: "al-LER-gic — 두 번째 음절",
  museum: "mu-SE-um — 가운데 강세",
  airport: "AIR-port — 앞에 강세",
  restaurant: "RES-tau-rant — [레스트런], 3음절",
  umbrella: "um-BREL-la — 가운데 강세",
  important: "im-POR-tant — 가운데 강세",
  recommend: "rec-om-MEND — 마지막 음절에 강세",
  international: "in-ter-NA-tion-al",
  conditioning: "con-DI-tion-ing — 두 번째 음절",
  complimentary: "com-pli-MEN-ta-ry",
  contactless: "CON-tact-less — 앞에 강세"
};

/** 패턴별 팁 (우선순위 순) */
export const PATTERNS: { test: (w: string) => boolean; tip: string }[] = [
  { test: w => /r/.test(w) && /l/.test(w), tip: "r과 l이 한 단어에 있습니다. r은 혀를 어디에도 닿지 않게 말고, l은 혀끝을 윗니 뒤 잇몸에 확실히 붙이세요." },
  { test: w => /th/.test(w),               tip: "th는 혀끝을 윗니 사이에 살짝 물고 바람을 냅니다. ㅅ·ㄷ로 발음하면 다른 단어로 들립니다." },
  { test: w => /f/.test(w),                tip: "f는 윗니로 아랫입술을 살짝 물고 바람만 — ㅍ가 아닙니다." },
  { test: w => /v/.test(w),                tip: "v는 f와 같은 입 모양에서 목을 울려주세요 — ㅂ가 아닙니다." },
  { test: w => /z/.test(w),                tip: "z는 ㅈ가 아니라 목이 울리는 [즈~] 소리입니다." },
  { test: w => /r/.test(w),                tip: "r은 혀를 뒤로 말되 입천장에 닿지 않게. ㄹ로 굴리면 l처럼 들립니다." },
  { test: w => /l/.test(w),                tip: "l은 혀끝을 윗니 뒤 잇몸에 붙인 채로 소리 냅니다." },
  { test: w => /[aeiou]([bcdfgkmnpt])\1?$/.test(w) || /[bcdgkpt]$/.test(w), tip: "끝소리에 '으'를 붙이지 마세요. [-트/-크/-프]가 아니라 짧게 끊습니다." },
  { test: w => /^(a|ha|ba|ca|ma|pa|ta|sa)[bcdgkmnpt]/.test(w), tip: "a는 [애]에 가깝게 — 입을 옆으로 벌려주세요." },
  { test: w => /^w/.test(w),               tip: "w는 입술을 동그랗게 모았다가 터뜨리듯 시작합니다." }
];

/** 단어 하나에 대한 발음 팁 최대 2개 */
export function pronTips(word: string): string[] {
  const w = String(word).toLowerCase().replace(/[^a-z']/g, "");
  if (!w) return [];
  const out: string[] = [];
  if (SILENT[w]) out.push("🔇 " + SILENT[w]);
  if (STRESS[w]) out.push("🎵 " + STRESS[w]);
  for (const p of PATTERNS) {
    if (out.length >= 2) break;
    if (p.test(w)) out.push("👄 " + p.tip);
  }
  if (!out.length) out.push("👄 한 음절씩 또박또박, 끝소리까지 살려서 말해보세요.");
  return out.slice(0, 2);
}
