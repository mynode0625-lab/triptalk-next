"use client";

import { Logo } from "@/components/ui/Logo";

type Props = {
  avatar: string;
  name: string;
  scene: string;
  onSetup: () => void;
  onPanel: () => void;
};

export function TopBar({ avatar, name, scene, onSetup, onPanel }: Props) {
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
          <button className="chip-btn" id="btnPanel" onClick={onPanel}>📋 리포트</button>
          <a className="chip-btn chip-btn--link" href="/login">로그인</a>
        </div>
      </div>
    </header>
  );
}
