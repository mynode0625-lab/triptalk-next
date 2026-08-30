import Link from "next/link";
import { CHARACTERS } from "@/lib/data/characters";

/**
 * AI 캐릭터 카드.
 *
 * 예전에는 카드를 누르면 첫 마디가 펼쳐지기만 했습니다. 소개를 읽고 마음이 든
 * 사람이 그 캐릭터와 말해보려면 다시 연습실로 가서 같은 카드를 한 번 더 찾아야
 * 했습니다. 지금은 카드를 누르면 그 캐릭터의 연습으로 바로 들어가고, 첫 마디는
 * 접지 않고 그대로 보여줍니다 — 들어가기 전에 어떤 상대인지 알 수 있게.
 */
export function Characters() {
  return (
    <div className="characters" id="characterGrid">
      {CHARACTERS.map(c => {
        const body = (
          <>
            <div className="char__avatar">{c.emoji}</div>
            <div className="char__name">{c.name}</div>
            <div className="char__role">{c.role}</div>
            <p className="char__desc">{c.desc}</p>
            <div className="char__tags">
              {c.tags.map(t => (
                <span key={t}>{t}</span>
              ))}
            </div>
            <div className="char__line">
              <q>
                “{c.line}”
                <em>{c.ko}</em>
              </q>
            </div>
          </>
        );

        /* 시나리오가 준비된 캐릭터만 누를 수 있습니다. 나머지는 카드를 지우지 않고
           "준비 중" 으로 두어, 앞으로 만날 사람까지 함께 보이게 합니다. */
        return c.scene ? (
          <Link
            key={c.name}
            href={`/practice?scene=${c.scene}`}
            className="char char--link reveal"
          >
            {body}
            <span className="char__go">🎙 이 캐릭터와 연습하기 →</span>
          </Link>
        ) : (
          <div key={c.name} className="char reveal">
            {body}
            <span className="char__soon">준비 중</span>
          </div>
        );
      })}
    </div>
  );
}
