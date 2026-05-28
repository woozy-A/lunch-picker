(function attachResultList(global) {
  const app = (global.LunchApp = global.LunchApp || {});
  const { MenuCard } = app;

  function getSubjectParticle(text) {
    const lastChar = [...(text || "")].pop();
    const code = lastChar ? lastChar.charCodeAt(0) : 0;
    const hangulStart = 0xac00;
    const hangulEnd = 0xd7a3;

    if (code < hangulStart || code > hangulEnd) return "가";
    return (code - hangulStart) % 28 === 0 ? "가" : "이";
  }

  function ResultList({ featured, menus, onOpen, onPick, getReason }) {
    if (!menus.length) {
      return (
        <section className="results-band">
          <div className="empty-state">
            <h2>후보가 사라졌습니다</h2>
            <p className="muted">점심은 엄격하면 굶습니다. 조건을 조금 풀어주세요.</p>
          </div>
        </section>
      );
    }

    return (
      <section className="results-band" id="results">
        <div className="result-toolbar">
          <div>
            <h2>{featured ? `${featured.name}${getSubjectParticle(featured.name)} 싫다면` : "이 메뉴가 싫다면"}</h2>
            <p className="muted small">비슷한 메뉴 2개만 볼게요.</p>
          </div>
        </div>

        <div className="candidate-list">
          {menus.map((menu) => (
            <div className="candidate-wrap" key={menu.id}>
              <MenuCard menu={menu} reason={getReason(menu)} onOpen={onOpen} onPick={onPick} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  app.ResultList = ResultList;
})(window);
