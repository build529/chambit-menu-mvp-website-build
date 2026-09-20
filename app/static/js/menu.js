(() => {
  const displayDate = document.body.dataset.date;

  function escapeHtml(value) {
    const element = document.createElement("div");
    element.textContent = value;
    return element.innerHTML;
  }

  function renderMenu(card, mealPeriod, entry) {
    const isAiPreview = entry.image_source === "ai_generated";
    const mealName =
      mealPeriod.charAt(0).toUpperCase() + mealPeriod.slice(1);

    card.innerHTML = `
      <h2>${escapeHtml(entry.title)}</h2>

      ${
        entry.message
          ? `<p class="meal-message">${escapeHtml(entry.message)}</p>`
          : ""
      }

      <img
        src="${entry.image_url}"
        alt="${
          isAiPreview ? "AI meal preview" : "Meal photo"
        } for ${mealName}, ${entry.line_type} Line, ${displayDate}."
      >

      <p class="notice ${isAiPreview ? "" : "hidden"}">
        AI meal preview · Actual serving may vary.
      </p>

      <ul>
        ${entry.menu_items
          .map((item) => `<li>${escapeHtml(item)}</li>`)
          .join("")}
      </ul>
    `;
  }

  function renderEmptyState(card, mealPeriod) {
    const mealName =
      mealPeriod.charAt(0).toUpperCase() + mealPeriod.slice(1);

    card.innerHTML = `
      <div class="empty">
        <h2>${mealName} menu is being prepared.</h2>
        <p>Please check again soon.</p>
      </div>
    `;
  }

  async function selectLine({
    mealPeriod,
    line,
    card,
    buttons,
  }) {
    const url = new URL(window.location.href);

    if (mealPeriod === "breakfast") {
      url.searchParams.set("breakfast_line", line);
    } else {
      url.searchParams.set("line", line);
    }

    window.history.pushState({}, "", url);

    buttons.forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.line === line),
      );
    });

    try {
      const response = await fetch(
        `/api/v1/menus?date=${encodeURIComponent(
          displayDate,
        )}&meal_period=${encodeURIComponent(
          mealPeriod,
        )}&line=${encodeURIComponent(line)}`,
      );

      if (!response.ok) {
        throw new Error("Menu is unavailable.");
      }

      const entry = await response.json();
      renderMenu(card, mealPeriod, entry);
    } catch {
      renderEmptyState(card, mealPeriod);
    }
  }

  document.querySelectorAll("[data-meal-period]").forEach((switcher) => {
    const mealPeriod = switcher.dataset.mealPeriod;
    const cardId =
      mealPeriod === "breakfast"
        ? "breakfast-menu-card"
        : "menu-card";

    const card = document.querySelector(`#${cardId}`);

    if (!card) {
      return;
    }

    const buttons = [
      ...switcher.querySelectorAll("[data-line]"),
    ];

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        if (button.disabled) {
          return;
        }

        selectLine({
          mealPeriod,
          line: button.dataset.line,
          card,
          buttons,
        });
      });
    });
  });
})();
