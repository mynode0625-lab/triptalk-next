"use client";

import { useCallback, useState } from "react";
import Link from "next/link";

/**
 * 후기 관리 화면.
 *
 * 계정으로 운영자를 가리지 않고 **서버만 아는 열쇠**를 맞춥니다. 지금 로그인은
 * 데모라 "이 사람이 운영자다" 라고 말할 근거가 없기 때문입니다 —
 * `/api/admin/reviews` 주석 참고.
 *
 * 열쇠는 **어디에도 저장하지 않습니다.** 화면을 새로 열면 다시 입력해야 하는데,
 * 저장해 두면 그 브라우저를 쓰는 다음 사람이 그대로 이어받습니다. 관리 화면을
 * 자주 열 일도 아니라 저장할 이유가 없습니다.
 *
 * 지우기보다 **감추기**를 먼저 권합니다. 잘못 감췄으면 되돌릴 수 있습니다.
 */

type AdminReview = {
  id: string;
  authorName: string;
  rating: number;
  body: string;
  createdAt: string;
  status: string;
};

export default function AdminReviewsPage() {
  const [key, setKey] = useState("");
  const [reviews, setReviews] = useState<AdminReview[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (adminKey: string) => {
    if (!adminKey) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/reviews", {
        cache: "no-store",
        headers: { "x-admin-key": adminKey }
      });
      const data = (await res.json()) as { reviews?: AdminReview[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? "목록을 불러오지 못했습니다.");
        setReviews(null);
        return;
      }
      setReviews(data.reviews ?? []);
    } catch {
      setError("연결이 끊겼습니다.");
    } finally {
      setBusy(false);
    }
  }, []);

  const act = async (
    review: AdminReview,
    action: "hide" | "show" | "delete"
  ) => {
    if (action === "delete") {
      const ok = window.confirm(
        `이 후기를 완전히 지웁니다. 되돌릴 수 없습니다.\n\n“${review.body.slice(0, 40)}…”`
      );
      if (!ok) return;
    }

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const res = await fetch("/api/admin/reviews", {
        method: action === "delete" ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-key": key },
        body: JSON.stringify(
          action === "delete"
            ? { id: review.id }
            : { id: review.id, status: action === "hide" ? "hidden" : "visible" }
        )
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "처리하지 못했습니다.");
        return;
      }
      setNotice(
        action === "delete" ? "지웠습니다." : action === "hide" ? "감췄습니다." : "다시 보이게 했습니다."
      );
      await load(key);
    } catch {
      setError("연결이 끊겼습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="admin">
      <div className="admin__head">
        <h1>후기 관리</h1>
        <p>
          부적절한 후기를 감추거나 지웁니다. <b>감추기</b>는 되돌릴 수 있고,
          <b> 삭제</b>는 되돌릴 수 없습니다. 먼저 감춰두고 판단하시는 편이 안전합니다.
        </p>
      </div>

      <form
        className="admin__key"
        onSubmit={e => {
          e.preventDefault();
          void load(key);
        }}
      >
        <input
          type="password"
          value={key}
          onChange={e => setKey(e.target.value)}
          placeholder="관리 열쇠"
          autoComplete="off"
        />
        <button type="submit" className="btn btn--primary btn--sm" disabled={busy || !key}>
          {busy ? "확인 중…" : "불러오기"}
        </button>
        <Link href="/" className="btn btn--outline btn--sm">홈으로</Link>
      </form>

      {error ? <p className="admin__msg" role="alert">{error}</p> : null}
      {notice ? <p className="admin__msg admin__msg--ok">{notice}</p> : null}

      {reviews === null ? null : reviews.length === 0 ? (
        <p className="admin__empty">후기가 없습니다.</p>
      ) : (
        <div className="admin__list">
          {reviews.map(r => {
            const hidden = r.status !== "visible";
            return (
              <article className={"arow" + (hidden ? " arow--hidden" : "")} key={r.id}>
                <div className="arow__top">
                  <span className="arow__name">{r.authorName}</span>
                  <span className="arow__meta">
                    별점 {r.rating} · {new Date(r.createdAt).toLocaleString("ko-KR")}
                  </span>
                  {hidden ? <span className="arow__tag">{r.status}</span> : null}
                </div>
                <p className="arow__body">{r.body}</p>
                <div className="arow__cta">
                  {hidden ? (
                    <button
                      type="button"
                      className="btn btn--outline"
                      disabled={busy}
                      onClick={() => void act(r, "show")}
                    >
                      다시 보이기
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn--outline"
                      disabled={busy}
                      onClick={() => void act(r, "hide")}
                    >
                      감추기
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn--danger"
                    disabled={busy}
                    onClick={() => void act(r, "delete")}
                  >
                    삭제
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
