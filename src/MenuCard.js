(function attachMenuCard(global) {
  const app = (global.LunchApp = global.LunchApp || {});

  function MenuCard({ menu, reason, onOpen, onPick, imageSeed = "" }) {
    const pillLabel = menu.keywords?.[0] || menu.category;
    const imageInfo = app.images?.getMenuImageInfo(menu, imageSeed) || { url: "./assets/lunch-spread.png" };

    return (
      <article className="candidate-item">
        <button className="candidate-photo" type="button" onClick={() => onPick(menu)} aria-label={`${menu.name} 선택`}>
          <img
            src={imageInfo.url}
            alt=""
            loading="lazy"
            onLoad={() => app.images?.recordImageUse(menu, imageInfo)}
            onError={(event) => {
              event.currentTarget.src = app.images?.FALLBACK_IMAGE || "./assets/lunch-spread.png";
            }}
          />
        </button>
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
