(function attachMenuCard(global) {
  const app = (global.LunchApp = global.LunchApp || {});

  function MenuCard({ menu, reason, onOpen, onPick }) {
    const pillLabel = menu.keywords?.[0] || menu.category;

    return (
      <article className="candidate-item">
        <button className="candidate-main" type="button" onClick={() => onPick(menu)}>
          <span className="candidate-name">{menu.name}</span>
          <span className="candidate-reason">{reason}</span>
        </button>
        <div className="candidate-side">
          <span className="category-dot">{pillLabel}</span>
          <button className="text-btn" type="button" onClick={() => onOpen(menu)}>
            이유
          </button>
        </div>
      </article>
    );
  }

  app.MenuCard = MenuCard;
})(window);
