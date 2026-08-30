"use client";

import { useCallback, useState } from "react";
import Link from "next/link";

/**
 * 후기 관리 화면.
 *
 * 관리자는 **한 사람**입니다. 아이디와 비밀번호로 로그인하면 서버가 서명한
 * HttpOnly 쿠키를 발급하고, 이후 요청은 그 쿠키로 통과합니다 — 비밀번호가 매
 * 요청에 실려 다니지 않게 하려는 것입니다.
 *
 * 비밀번호는 화면 어디에도 남기지 않습니다. 자바스크립트가 읽을 수 없는 쿠키만
 * 남으므로, 브라우저에 값을 저장했다가 다음 사람이 이어받는 일이 없습니다.
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
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [reviews, setReviews] = useState<AdminReview[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/reviews", { cache: "no-store" });
      const data = (await res.json()) as { reviews?: AdminReview[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? "목록을 불러오지 못했습니다.");
        setReviews(null);
        setSignedIn(false);
        return;
      }
      setReviews(data.reviews ?? []);
      setSignedIn(true);
    } catch {
      setError("연결이 끊겼습니다.");
    } finally {
      setBusy(false);
    }
  }, []);

  const signIn = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, password })
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "로그인하지 못했습니다.");
        return;
      }
      setPassword("");            // 화면에 남겨둘 이유가 없습니다
      await load();
    } catch {
      setError("연결이 끊겼습니다.");
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await fetch("/api/admin/session", { method: "DELETE" });
    setSignedIn(false);
    setReviews(null);
    setId("");
    setPassword("");
    setNotice("");
  };

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
        headers: { "Content-Type": "application/json" },
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
      await load();
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
          운영자 한 사람만 들어올 수 있습니다.
        </p>
      </div>

      {signedIn ? (
        <div className="admin__key">
          <button type="button" className="btn btn--outline btn--sm" onClick={() => void signOut()}>
            로그아웃
          </button>
          <Link href="/" className="btn btn--outline btn--sm">홈으로</Link>
        </div>
      ) : (
        <form
          className="admin__key"
          onSubmit={e => {
            e.preventDefault();
            void signIn();
          }}
        >
          <input
            type="text"
            value={id}
            onChange={e => setId(e.target.value)}
            placeholder="아이디"
            autoComplete="username"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="비밀번호"
            autoComplete="current-password"
          />
          <button type="submit" className="btn btn--primary btn--sm" disabled={busy || !id || !password}>
            {busy ? "확인 중…" : "로그인"}
          </button>
          <Link href="/" className="btn btn--outline btn--sm">홈으로</Link>
        </form>
      )}

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
