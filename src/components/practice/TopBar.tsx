"use client";

import { useEffect, useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { fetchSession, logout } from "@/lib/auth/session";

type Props = {
  avatar: string;
  name: string;
  scene: string;
  /** 리포트 패널이 접혀 있는지 — 버튼이 지금 상태를 알려주는 데 씁니다 */
  panelHidden: boolean;
  onSetup: () => void;
  onPanel: () => void;
};

export function TopBar({ avatar, name, scene, panelHidden, onSetup, onPanel }: Props) {
  /* 랜딩 헤더와 같은 이유입니다 — 로그인한 사람에게 "로그인" 을 계속 보여주면
     로그인이 안 된 것처럼 읽힙니다. 확인 전(null)에는 로그인 쪽을 둡니다. */
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    void fetchSession().then(session => {
      if (alive) setSignedIn(Boolean(session));
    });
    return () => { alive = false; };
  }, []);

  return (
    <header className="pbar">
      <div className="pbar__inner">
        <Logo href="/" variant="sm" />

        <div className="pbar__scene" id="pbarScene">
          <span className="pbar__avatar" id="barAvatar">{avatar}</span>
          <div>
            <strong id="barName">{name}</strong>
            <small id="barScene">{scene}</small>
          </div>
        </div>

        <div className="pbar__actions">
          <button className="chip-btn" id="btnSetup" onClick={onSetup}>↺ 상황 바꾸기</button>
          <button
            className={"chip-btn" + (panelHidden ? "" : " is-on")}
            id="btnPanel"
            aria-pressed={!panelHidden}
            onClick={onPanel}
          >
            📋 리포트
          </button>
          {signedIn ? (
            <button
              className="chip-btn chip-btn--link"
              onClick={() => { void logout().then(() => setSignedIn(false)); }}
            >
              로그아웃
            </button>
          ) : (
            <a className="chip-btn chip-btn--link" href="/login">로그인</a>
          )}
        </div>
      </div>
    </header>
  );
}
