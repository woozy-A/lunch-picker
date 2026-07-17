(function attachDetailModal(global) {
  const app = (global.LunchApp = global.LunchApp || {});

  function DetailModal({ menu, feedback, reason, officeLine, hasActiveFilters, onClose, onFeedback, onNearbySearch, isFindingNearby, nearbyStatus = "", imageSeed = "" }) {
    if (!menu) {
      return null;
    }

    const imageInfo = app.images?.getMenuImageInfo(menu, imageSeed) || { url: "./assets/lunch-spread.png", variantCount: 0 };
    const creditLabel = app.images?.getImageCreditLabel(imageInfo) || "";
    const modalRef = app.modal.useModalFocus({ onClose });

    return (
      <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
        <section
          ref={modalRef}
          className="modal compact-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="detail-title"
          tabIndex="-1"
          onMouseDown={(event) => event.stopPropagation()}
        >
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
            <figure className="detail-photo">
              <img
                src={imageInfo.url}
                alt={`${menu.name} 사진`}
                loading="lazy"
                onLoad={() => app.images?.recordImageUse(menu, imageInfo)}
                onError={(event) => {
                  event.currentTarget.src = app.images?.FALLBACK_IMAGE || "./assets/lunch-spread.png";
                }}
              />
              {creditLabel && imageInfo.sourceUrl && (
                <figcaption>
                  <a href={imageInfo.sourceUrl} target="_blank" rel="noreferrer">
                    사진: {creditLabel}
                  </a>
                  {imageInfo.variantCount > 1 && <span>사진 {imageInfo.variantCount}장</span>}
                </figcaption>
              )}
            </figure>

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
                <button className="btn" type="button" onClick={onNearbySearch} disabled={isFindingNearby}>
                  {isFindingNearby ? "위치 확인 중" : "근처에서 찾기"}
                </button>
              </div>
              {nearbyStatus && (
                <p className="nearby-status" role="status">
                  {nearbyStatus}
                </p>
              )}
            </section>
          </div>
        </section>
      </div>
    );
  }

  app.DetailModal = DetailModal;
})(window);
