/**
 * 데모 세션 발급
 *
 * 신한 SOL 연동 키가 없어도 로그인 "흐름"은 볼 수 있어야 합니다. 원본부터
 * 있던 데모 모드를 서버 쪽으로 옮긴 것입니다.
 *
 * **해당 제공자의 실제 키가 설정돼 있으면 거부합니다.** 그렇지 않으면 진짜 키가
 * 있는 배포본에서도 아무나 세션을 만들 수 있게 되기 때문입니다.
 *
 * ⚠ 이 경로는 **신원을 찍어내는 곳**입니다. 부를 때마다 새 `sub` 가 나오므로,
 * 제한이 없으면 "한 계정 한 번" 같은 규칙이 계정을 갈아치우는 것만으로 무너지고
 * 차단 목록도 무의미해집니다. IP 당 발급 수를 셉니다.
 */

/** 한 IP 가 한 시간에 만들 수 있는 데모 세션 수. 사람이 쓰기에는 넉넉합니다. */
const MAX_PER_IP_HOUR = 10;
import type { NextRequest } from "next/server";
import { HOUR, clientIp, hit } from "@/lib/server/rateLimit";
import { issueSession } from "@/lib/auth/cookie";
import { PROVIDERS } from "@/lib/auth/providers";
import type { ProviderKey } from "@/types/session";

const CLIENT_IDS: Record<ProviderKey, string | undefined> = {
  shinhan: process.env.NEXT_PUBLIC_SHINHAN_CLIENT_ID
};

const isProvider = (v: unknown): v is ProviderKey => v === "shinhan";

export async function POST(request: NextRequest) {
  let provider: unknown;
  try { ({ provider } = (await request.json()) as { provider?: unknown }); }
  catch { return Response.json({ error: "잘못된 요청 본문입니다." }, { status: 400 }); }

  if (!isProvider(provider)) {
    return Response.json({ error: "지원하지 않는 제공자입니다." }, { status: 404 });
  }
  if (CLIENT_IDS[provider]) {
    // 실제 로그인이 가능한 제공자라면 데모로 우회할 수 없어야 합니다.
    return Response.json({ error: "이 제공자는 실제 로그인을 사용합니다." }, { status: 409 });
  }

  const limit = hit("demo:session", clientIp(request), MAX_PER_IP_HOUR, HOUR);
  if (!limit.ok) {
    return Response.json(
      { error: "잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  const meta = PROVIDERS[provider];

  /* 데모 세션에도 **방문자마다 다른 id** 를 발급합니다.
   *
   * 예전에는 데모 세션이 전부 같은 사람이었습니다. 그 상태로 후기에 로그인을 걸면
   * `unique (author_provider, author_sub)` 때문에 **두 번째 사람이 첫 사람의 글을
   * 덮어씁니다.** 임시 신원을 주면 각자 자기 후기를 갖고, 남용자를 차단할 수도
   * 있습니다.
   *
   * ⚠ 장벽으로는 약합니다 — 로그아웃하고 다시 들어오면 새 사람이 됩니다. 목적은
   * 완벽한 차단이 아니라 사후 대응과 도배 방지입니다. 실제 연동 키가 들어오면
   * 이 경로 자체가 막히고(위의 409) 진짜 계정으로 대체됩니다.
   */
  const sub = `demo-${crypto.randomUUID()}`;

  const session = {
    provider,
    sub,
    name: meta.demo.name,
    email: meta.demo.email,
    avatar: meta.avatar,
    loginAt: new Date().toISOString(),
    demo: true
  };
  await issueSession(session);
  return Response.json({ session }, { headers: { "Cache-Control": "no-store" } });
}
