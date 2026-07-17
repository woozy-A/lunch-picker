(function attachResultList(global) {
  const app = (global.LunchApp = global.LunchApp || {});
  const { MenuCard } = app;

  function ResultList({ featured, menus, onOpen, onPick, getReason, imageSeed = "" }) {
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
            <h2>{featured ? `${featured.name} 말고 다른 느낌` : "다른 후보도 있어요"}</h2>
            <p className="muted small">비슷한 결로 2개만 조용히 골라봤어요.</p>
          </div>
        </div>

        <div className="candidate-list">
          {menus.map((menu) => (
            <div className="candidate-wrap" key={menu.id}>
              <MenuCard menu={menu} reason={getReason(menu)} onOpen={onOpen} onPick={onPick} imageSeed={`${imageSeed}:${menu.id}`} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  app.ResultList = ResultList;
})(window);
