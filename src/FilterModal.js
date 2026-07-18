(function attachFilterModal(global) {
  const app = (global.LunchApp = global.LunchApp || {});

  function toggleInList(list, value) {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  }

  function FilterModal({ categories, moodOptions, filters, onChange, onClose, onApply, onReset }) {
    const draft = filters;
    const modalRef = app.modal.useModalFocus({ onClose });

    function update(nextPatch) {
      onChange({ ...draft, ...nextPatch });
    }

    return (
      <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
        <section
          ref={modalRef}
          className="modal compact-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="filter-title"
          tabIndex="-1"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <header className="modal-head">
            <div>
              <h2 id="filter-title">입맛 맞추기</h2>
              <p className="muted small">입맛, 상황, 지갑 상태를 골라주세요.</p>
            </div>
            <button className="close-btn" type="button" onClick={onClose} aria-label="닫기">
              ×
            </button>
          </header>

          <div className="modal-body">
            <section className="filter-section">
              <h3>지금 상황</h3>
              <div className="option-grid mood-grid">
                {moodOptions.map((option) => (
                  <button
                    key={option.key}
                    className={`option-btn ${draft.moods.includes(option.key) ? "is-selected" : ""}`}
                    type="button"
                    aria-pressed={draft.moods.includes(option.key)}
                    onClick={() => update({ moods: toggleInList(draft.moods, option.key) })}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="filter-section">
              <h3>대충 먹고 싶은 계열</h3>
              <div className="option-grid">
                {categories.map((category) => (
                  <button
                    key={category}
                    className={`option-btn ${draft.categories.includes(category) ? "is-selected" : ""}`}
                    type="button"
                    aria-pressed={draft.categories.includes(category)}
                    onClick={() => update({ categories: toggleInList(draft.categories, category) })}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </section>

            <section className="filter-section">
              <h3>지갑 상태</h3>
              <div className="option-grid budget-grid">
                {["상관없음", "월급 전", "월급날", "법카"].map((budget) => (
                  <button
                    key={budget}
                    className={`option-btn ${draft.budget === budget ? "is-selected" : ""}`}
                    type="button"
                    aria-pressed={draft.budget === budget}
                    onClick={() => update({ budget })}
                  >
                    {budget}
                  </button>
                ))}
              </div>
            </section>

            <div className="modal-actions filter-modal-actions">
              <button className="btn" type="button" onClick={onReset}>
                아무거나
              </button>
              <button className="btn btn-primary" type="button" onClick={onApply}>
                이 입맛으로 뽑기
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  app.FilterModal = FilterModal;
})(window);
