/**
 * 데모 세션 발급
 *
 * 소셜 키를 하나도 넣지 않아도 로그인 "흐름"은 볼 수 있어야 합니다. 원본부터
 * 있던 데모 모드를 서버 쪽으로 옮긴 것입니다.
 *
 * **해당 제공자의 실제 키가 설정돼 있으면 거부합니다.** 그렇지 않으면 진짜 키가
 * 있는 배포본에서도 아무나 세션을 만들 수 있게 되기 때문입니다.
 */
import type { NextRequest } from "next/server";
import { issueSession } from "@/lib/auth/cookie";
import { PROVIDERS } from "@/lib/auth/providers";
import type { ProviderKey } from "@/types/session";

const CLIENT_IDS: Record<ProviderKey, string | undefined> = {
  kakao: process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID,
  naver: process.env.NEXT_PUBLIC_NAVER_CLIENT_ID,
  google: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
};

const isProvider = (v: unknown): v is ProviderKey =>
  v === "kakao" || v === "naver" || v === "google";

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

  const meta = PROVIDERS[provider];
  const session = {
    provider,
    name: meta.demo.name,
    email: meta.demo.email,
    avatar: meta.avatar,
    loginAt: new Date().toISOString(),
    demo: true
  };
  await issueSession(session);
  return Response.json({ session }, { headers: { "Cache-Control": "no-store" } });
}
