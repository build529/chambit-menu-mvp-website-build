(() => {
  const card = document.querySelector("#menu-card");

  if (!card) {
    return;
  }

  const displayDate = document.body.dataset.date;
  const buttons = [
    ...document.querySelectorAll("[data-line]"),
  ];

  function escapeHtml(value) {
    const element = document.createElement("div");
    element.textContent = value;
    return element.innerHTML;
  }

  function renderMenu(entry) {
    const isAiPreview = entry.image_source === "ai_generated";

    card.innerHTML = `
      <h2 id="menu-heading">${escapeHtml(entry.title)}</h2>

      ${
      entry.message
      ? `<p class="meal-message">${escapeHtml(entry.message)}</p>`
      : ""
      }

      <img
        id="menu-image"
        src="${entry.image_url}"
        alt="${
          isAiPreview ? "AI meal preview" : "Meal photo"
        } for Lunch, ${entry.line_type} Line, ${displayDate}."
      >

      <p class="notice ${isAiPreview ? "" : "hidden"}">
        AI meal preview · Actual serving may vary.
      </p>

      <ul id="menu-items">
        ${entry.menu_items
          .map((item) => `<li>${escapeHtml(item)}</li>`)
          .join("")}
      </ul>
    `;
  }

  function renderEmptyState() {
    card.innerHTML = `
      <div class="empty">
        <h2>Today's menu is being prepared.</h2>
        <p>Please check again soon.</p>
      </div>
    `;
  }

  async function selectLine(line) {
    const url = new URL(window.location.href);

    url.searchParams.set("date", displayDate);
    url.searchParams.set("meal", "lunch");
    url.searchParams.set("line", line);

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
        )}&meal_period=lunch&line=${encodeURIComponent(line)}`,
      );

      if (!response.ok) {
        throw new Error("Menu is unavailable.");
      }

      const entry = await response.json();

      renderMenu(entry);
    } catch {
      renderEmptyState();
    }
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      if (!button.disabled) {
        selectLine(button.dataset.line);
      }
    });
  });
})();
