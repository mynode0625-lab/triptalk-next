"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * 사용자 후기.
 *
 * 예전 이 자리에는 지어낸 후기 네 개가 있었습니다("김지현 · 3개월 사용"). 실제로
 * 존재하지 않는 사람들이라 지웠고, 대신 **진짜로 남긴 글만 보이는 자리**를 만듭니다.
 * 그래서 처음에는 비어 있습니다. 비어 있는 것이 지어낸 것보다 낫습니다.
 *
 * 데이터는 Supabase 에 있고 `/api/reviews` 를 통해서만 오갑니다. 브라우저가
 * 데이터베이스를 직접 부르지 않습니다 — `src/lib/db/client.ts` 주석 참고.
 *
 * **쓰기는 로그인한 사람만** 할 수 있습니다. 남용에 대응하려면 글이 계정에 묶여야
 * 하기 때문입니다. 이름은 사용자가 입력하지 않고 로그인 정보에서 가져옵니다 —
 * 입력받으면 남의 이름을 적을 수 있습니다.
 *
 * 서버 컴포넌트로 두면 초기 HTML 에 후기가 담기지만, 랜딩 전체가 매 요청 렌더로
 * 바뀌고 방금 남긴 후기가 바로 보이지 않습니다. 후기를 남긴 사람이 자기 글을 즉시
 * 보는 편이 중요해서 클라이언트에서 읽습니다.
 *
 * 기능이 꺼져 있으면(환경변수 없음) 이 섹션은 아예 그리지 않습니다. "준비 중" 같은
 * 빈 껍데기를 두면 그것대로 사실이 아닌 화면이 됩니다.
 */

type Review = {
  id: string;
  authorName: string;
  rating: number;
  body: string;
  createdAt: string;
};

const BODY_MIN = 5;
const BODY_MAX = 200;

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
}

const Stars = ({ n }: { n: number }) => (
  <span className="review__stars" aria-label={`5점 만점에 ${n}점`}>
    {"★".repeat(n)}
    <i>{"★".repeat(5 - n)}</i>
  </span>
);

export function Reviews() {
  const [state, setState] = useState<"loading" | "off" | "ready">("loading");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [canWrite, setCanWrite] = useState(false);
  /** 내가 이미 남긴 후기. 한 계정에 하나이므로 있거나 없거나 둘 중 하나입니다. */
  const [mine, setMine] = useState<Review | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  /* 후기는 서버가 가진 목록이라 React 바깥에서 한 번 당겨옵니다.
     기능이 꺼져 있거나 못 읽으면 섹션을 숨깁니다 — 랜딩이 깨지는 것보다 낫습니다. */
  useEffect(() => {
    let alive = true;
    void fetch("/api/reviews", { cache: "no-store" })
      .then(res => res.json() as Promise<{
        reviews?: Review[]; enabled?: boolean; canWrite?: boolean; mine?: Review | null;
      }>)
      .then(data => {
        if (!alive) return;
        if (!data.enabled) { setState("off"); return; }
        setReviews(data.reviews ?? []);
        setCanWrite(Boolean(data.canWrite));
        setMine(data.mine ?? null);
        setState("ready");
      })
      .catch(() => { if (alive) setState("off"); });
    return () => { alive = false; };
  }, []);

  /** 내 후기 삭제 — 지울 대상은 서버가 세션에서 정합니다. */
  const removeMine = async () => {
    if (!mine || busy) return;
    if (!window.confirm("남기신 후기를 지웁니다. 되돌릴 수 없습니다.")) return;

    setBusy(true);
    try {
      const res = await fetch("/api/reviews", { method: "DELETE" });
      if (!res.ok) return;
      setReviews(prev => prev.filter(r => r.id !== mine.id));
      setMine(null);
    } catch {
      /* 실패하면 화면을 그대로 둡니다 — 지워진 것처럼 보이는 쪽이 더 나쁩니다 */
    } finally {
      setBusy(false);
    }
  };

  if (state !== "ready") return null;

  return (
    <section className="section section--tint" id="reviews">
      <div className="container container--narrow">
        <div className="section-head reveal">
          <span className="eyebrow">사용자 후기</span>
          <h2>연습해 본 사람들의 이야기</h2>
          {reviews.length ? null : (
            <p>아직 후기가 없습니다. 연습해 보셨다면 첫 번째로 남겨주세요.</p>
          )}
        </div>

        {reviews.length ? (
          <div className="reviews">
            {reviews.map(r => (
              <figure className="review reveal" key={r.id}>
                <Stars n={r.rating} />
                <blockquote>{r.body}</blockquote>
                <figcaption>
                  <b>{r.authorName}</b>
                  <span>{formatDate(r.createdAt)}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : null}

        {open ? (
          <ReviewForm
            existing={mine}
            onDone={review => {
              setMine(review);
              /* 한 계정에 후기 하나라, 다시 쓰면 새 글이 아니라 자기 글이 고쳐집니다.
                 같은 id 가 있으면 갈아끼우고 없을 때만 앞에 붙입니다. */
              setReviews(prev => {
                const without = prev.filter(r => r.id !== review.id);
                return [review, ...without];
              });
              setOpen(false);
            }}
            onCancel={() => setOpen(false)}
          />
        ) : (
          <div className="reviews__cta">
            {canWrite ? (
              mine ? (
                <>
                  <div className="reviews__mine">
                    <button type="button" className="btn btn--outline" onClick={() => setOpen(true)}>
                      ✍️ 내 후기 수정
                    </button>
                    <button
                      type="button"
                      className="btn btn--outline"
                      disabled={busy}
                      onClick={() => void removeMine()}
                    >
                      삭제
                    </button>
                  </div>
                  <p className="reviews__why">
                    후기는 한 분당 하나입니다. 다시 쓰면 새 글이 아니라 지금 글이 고쳐집니다.
                  </p>
                </>
              ) : (
                <button type="button" className="btn btn--outline" onClick={() => setOpen(true)}>
                  ✍️ 후기 남기기
                </button>
              )
            ) : (
              <>
                <Link href="/login" className="btn btn--outline">로그인하고 후기 남기기</Link>
                <p className="reviews__why">
                  후기는 로그인한 분만 남길 수 있습니다. 남용이 있을 때 대응하려면 글이
                  계정에 묶여 있어야 하기 때문입니다.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/* ── 작성 폼 ────────────────────────────────────── */

function ReviewForm({
  existing, onDone, onCancel
}: {
  existing: Review | null;
  onDone: (review: Review) => void;
  onCancel: () => void;
}) {
  /* 수정이면 지금 글에서 시작합니다. 빈 칸부터 다시 쓰게 하면 고치는 게 아니라
     새로 쓰는 일이 됩니다. */
  const [body, setBody] = useState(existing?.body ?? "");
  const [rating, setRating] = useState(existing?.rating ?? 5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim(), rating })
      });
      const data = (await res.json()) as { review?: Review; error?: string };
      if (!res.ok || !data.review) {
        setError(data.error ?? "후기를 저장하지 못했습니다.");
        return;
      }
      onDone(data.review);
    } catch {
      setError("연결이 끊겼습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="rform reveal" onSubmit={submit}>
      <div className="rform__row">
        <fieldset className="rform__stars">
          <legend>별점</legend>
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              className={"rform__star" + (n <= rating ? " is-on" : "")}
              aria-label={`${n}점`}
              aria-pressed={n === rating}
              onClick={() => setRating(n)}
            >
              ★
            </button>
          ))}
        </fieldset>
      </div>

      <label className="rform__field">
        <span>
          후기 <small>{body.length}/{BODY_MAX}</small>
        </span>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          minLength={BODY_MIN}
          maxLength={BODY_MAX}
          rows={3}
          placeholder="어떤 상황을 연습했고 무엇이 도움이 됐는지 적어주세요."
          required
        />
      </label>

      <p className="rform__note">
        이름은 <b>첫 글자만</b> 보입니다(예: 강**). 본문에는 연락처처럼 본인을 알아볼
        수 있는 정보를 적지 말아 주세요. 한 분당 후기는 하나이고, 언제든 고치거나
        지울 수 있습니다.
      </p>

      {error ? <p className="rform__error" role="alert">{error}</p> : null}

      <div className="rform__cta">
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? "저장 중…" : existing ? "수정하기" : "후기 남기기"}
        </button>
        <button type="button" className="btn btn--outline" onClick={onCancel} disabled={busy}>
          취소
        </button>
      </div>
    </form>
  );
}
