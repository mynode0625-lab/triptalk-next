export function Pain() {
  return (
    <section className="section pain">
      <div className="container">
        <div className="section-head reveal">
          <span className="eyebrow">왜 여행영어는 늘 어려울까요</span>
          <h2>단어는 아는데,<br />입이 안 떨어지는 이유</h2>
        </div>
        <div className="pain__grid">
          <article className="pain__card reveal">
            <span className="pain__icon">📖</span>
            <h3>교재는 현실과 다릅니다</h3>
            <p>&quot;How are you?&quot; &quot;I&apos;m fine, thank you.&quot;<br />실제 입국심사관은 그렇게 묻지 않습니다.</p>
          </article>
          <article className="pain__card reveal">
            <span className="pain__icon">😰</span>
            <h3>실수가 두렵습니다</h3>
            <p>사람 앞에서 틀리면 위축됩니다. 연습할 곳이 없으니 실전은 더 두려워집니다.</p>
          </article>
          <article className="pain__card reveal">
            <span className="pain__icon">⏳</span>
            <h3>공부할 시간이 없습니다</h3>
            <p>출국은 3주 남았는데 문법책 1장에서 멈춰 있습니다.</p>
          </article>
        </div>
      </div>
    </section>
  );
}
