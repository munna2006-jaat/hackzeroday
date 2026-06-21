/* rooms.js - API-backed rooms browse page */

onHZDReady(async () => {
  const grid = document.getElementById("roomsGrid");
  const searchInput = document.getElementById("roomsSearch");
  const filters = document.getElementById("roomFilters");
  let activeFilter = "all";
  let searchQuery = "";
  let rooms = [];

  function difficultyClass(difficulty) {
    if (difficulty === "easy") return "beginner";
    if (difficulty === "hard") return "advanced";
    return "intermediate";
  }

  function renderFilters() {
    const modules = [...new Set(rooms.map((room) => room.module?.slug).filter(Boolean))];
    filters.innerHTML =
      `<button class="filter-btn active" data-filter="all">All</button>` +
      modules
        .map((slug) => {
          const room = rooms.find((item) => item.module?.slug === slug);
          return `<button class="filter-btn" data-filter="${HZD.escapeHtml(slug)}">${HZD.escapeHtml(room.module.title)}</button>`;
        })
        .join("");

    filters.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        filters.querySelectorAll(".filter-btn").forEach((item) => item.classList.remove("active"));
        btn.classList.add("active");
        activeFilter = btn.dataset.filter;
        renderRooms();
      });
    });
  }

  function renderRooms() {
    const filtered = rooms.filter((room) => {
      const matchFilter = activeFilter === "all" || room.module?.slug === activeFilter;
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        room.title.toLowerCase().includes(q) ||
        (room.description || "").toLowerCase().includes(q) ||
        (room.module?.title || "").toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });

    if (!filtered.length) {
      grid.innerHTML = `
        <div class="empty-state">
          <h3>No rooms found</h3>
          <p>${rooms.length ? "Try a different search term or module filter." : "No published rooms are available yet."}</p>
        </div>`;
      return;
    }

    grid.innerHTML = filtered
      .map(
        (room) => `
      <article class="room-card" data-room-id="${room.slug}">
        <div class="room-card-top">
          <span class="path-difficulty ${difficultyClass(room.difficulty)}">${HZD.escapeHtml(room.difficulty)}</span>
          <span class="room-free-badge">Live</span>
        </div>
        <h3>${HZD.escapeHtml(room.title)}</h3>
        <p>${HZD.escapeHtml(room.description || "Hands-on HackZeroDay room.")}</p>
        <div class="room-meta-row">
          <span class="meta-item">${HZD.escapeHtml(room.duration)}</span>
          <span class="meta-item">${room.tasksCount || room._count?.tasks || 0} Tasks</span>
          <span class="meta-item">${HZD.escapeHtml(room.module?.title || "Module")}</span>
        </div>
        <button class="path-enroll-btn room-start-btn" data-room="${room.slug}">Start Room</button>
      </article>`
      )
      .join("");

    grid.querySelectorAll(".room-start-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        window.location.href = `room.html?slug=${encodeURIComponent(btn.dataset.room)}`;
      });
    });
  }

  try {
    const response = await fetch("/api/content/rooms");
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Unable to load rooms");
    rooms = data.rooms || [];
  } catch (error) {
    grid.innerHTML = `<div class="empty-state"><h3>Could not load rooms</h3><p>${HZD.escapeHtml(error.message)}</p></div>`;
    return;
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      searchQuery = searchInput.value.trim();
      renderRooms();
    });
  }

  renderFilters();
  renderRooms();
});
