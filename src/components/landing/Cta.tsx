"use client";

import { useState } from "react";

type Note = { text: string; tone: "" | "is-ok" | "is-error" };

const DEFAULT_NOTE: Note = {
  text: "베타 기간 무료입니다. 신용카드도 필요 없습니다.",
  tone: ""
};

export function Cta() {
  const [email, setEmail] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [note, setNote] = useState<Note>(DEFAULT_NOTE);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const v = email.trim();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

    setInvalid(!valid);
    if (!valid) {
      setNote({ text: "올바른 이메일 주소를 입력해 주세요.", tone: "is-error" });
      (e.currentTarget.querySelector("#ctaEmail") as HTMLInputElement | null)?.focus();
      return;
    }
    setNote({
      text: `${v} 로 체험 안내를 보냈습니다. (데모 페이지라 실제로 발송되지는 않습니다)`,
      tone: "is-ok"
    });
    setEmail("");
  };

  return (
    <section className="cta">
      <div className="container cta__inner reveal">
        <h2>
          다음 여행에선<br />망설이지 않기로 해요
        </h2>
        <p>오늘 10분이면, 공항에서의 3분이 편안해집니다.</p>
        <form className="cta__form" id="ctaForm" noValidate onSubmit={onSubmit}>
          <input
            type="email"
            id="ctaEmail"
            placeholder="이메일 주소를 입력하세요"
            aria-label="이메일 주소"
            className={invalid ? "is-error" : undefined}
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <button className="btn btn--dark" type="submit">무료로 시작하기</button>
        </form>
        <small className={"cta__note " + note.tone} id="ctaNote">{note.text}</small>
      </div>
    </section>
  );
}
