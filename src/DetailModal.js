(function attachDetailModal(global) {
  const app = (global.LunchApp = global.LunchApp || {});

  function DetailModal({ menu, feedback, reason, officeLine, searchUrl, hasActiveFilters, onClose, onFeedback }) {
    if (!menu) {
      return null;
    }

    return (
      <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
        <section className="modal compact-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title" onMouseDown={(event) => event.stopPropagation()}>
          <header className="modal-head">
            <div>
              <h2 id="detail-title">{hasActiveFilters ? "메뉴 메모" : "조건을 넣으면 더 정확해요"}</h2>
              <p className="muted small">
                {hasActiveFilters ? "오늘 상태를 기준으로 메뉴 결론만 설명합니다." : "지금은 넓게 섞은 랜덤 추천에 가깝습니다."}
              </p>
            </div>
            <button className="close-btn" type="button" onClick={onClose} aria-label="닫기">
              ×
            </button>
          </header>

          <div className="modal-body">
            <section className="decision-note">
              <span className="recommend-pop">점심 선언</span>
              <h3>{menu.name}</h3>
              <p>{reason}</p>
              <strong>{officeLine}</strong>
            </section>

            <div className="detail-list lean-list">
              <div className="detail-tile">
                <span>계열</span>
                <strong>{menu.category}</strong>
              </div>
              <div className="detail-tile">
                <span>지갑감</span>
                <strong>{menu.budget_tag || menu.priceLevel}</strong>
              </div>
              <div className="detail-tile">
                <span>느낌</span>
                <strong>{menu.spicy ? "매콤" : menu.healthy ? "가벼움" : "무난"}</strong>
              </div>
            </div>

            <section className="filter-section">
              <h3>구성 힌트</h3>
              <ul className="ingredient-list">
                {menu.ingredients.map((ingredient) => (
                  <li className="chip" key={ingredient}>
                    {ingredient}
                  </li>
                ))}
              </ul>
            </section>

            <section className="feedback-box">
              <div>
                <h3>오늘 이걸로?</h3>
                <p className="muted small">다음 추천에 반영할 정도만 가볍게 기록합니다.</p>
              </div>
              <div className="feedback-actions">
                <button
                  className={`btn ${feedback.verdict === "accepted" ? "btn-accent" : ""}`}
                  type="button"
                  onClick={() => onFeedback("accepted")}
                >
                  먹었다
                </button>
                <button
                  className={`btn ${feedback.verdict === "rejected" ? "btn-primary" : ""}`}
                  type="button"
                  onClick={() => onFeedback("rejected")}
                >
                  오늘은 아님
                </button>
                <a className="btn" href={searchUrl} target="_blank" rel="noreferrer">
                  근처에서 찾기
                </a>
              </div>
            </section>
          </div>
        </section>
      </div>
    );
  }

  app.DetailModal = DetailModal;
})(window);
