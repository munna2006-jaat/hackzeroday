/* leaderboard.js - Leaderboard page */

onHZDReady(() => {

  let leaderboardData = { global: [], colleges: [] };
  const leaderboardSearch = document.getElementById("leaderboardSearch");

  document.querySelectorAll(".leader-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".leader-tab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const tab = btn.dataset.leaderTab;
      document.getElementById("panelLeaderGlobal")?.classList.toggle("hidden", tab !== "global");
      document.getElementById("panelLeaderColleges")?.classList.toggle("hidden", tab !== "colleges");
      renderLeaderboards();
    });
  });

  if (leaderboardSearch) {
    leaderboardSearch.addEventListener("input", renderLeaderboards);
  }

  loadLeaderboardData();

  async function loadLeaderboardData() {
    try {
      const response = await fetch("/api/users/leaderboard", {
        headers: { Authorization: `Bearer ${HZD.token}` },
      });
      if (!response.ok) throw new Error("Failed to load leaderboard");
      leaderboardData = await response.json();
      renderLeaderboards();
    } catch (err) {
      console.error("[leaderboard] Load error:", err);
    }
  }

  function renderLeaderboards() {
    const searchQuery = (leaderboardSearch?.value || "").toLowerCase().trim();
    const globalBody = document.getElementById("leaderGlobalBody");
    const collegesBody = document.getElementById("leaderCollegesBody");

    if (globalBody) {
      const filtered = leaderboardData.global.filter(
        (u) =>
          u.name.toLowerCase().includes(searchQuery) ||
          (u.college && u.college.toLowerCase().includes(searchQuery))
      );

      globalBody.innerHTML =
        filtered
          .map((user) => {
            const isSelf = user.id === HZD.currentUser?.id;
            const rankClass = user.rank <= 3 ? `rank-${user.rank}` : "";
            const rankBadge = user.rank <= 3 ? `👑 ${user.rank}` : user.rank;
            return `<tr class="${isSelf ? "table-row-self" : ""}">
              <td><span class="rank-badge ${rankClass}">${rankBadge}</span></td>
              <td><div class="leaderboard-user-cell">
                <div class="user-avatar-mini">${user.name.charAt(0).toUpperCase()}</div>
                <div><span class="user-name-span">${HZD.escapeHtml(user.name)}</span>${isSelf ? '<span class="you-badge">YOU</span>' : ""}</div>
              </div></td>
              <td><span class="table-college-span">${HZD.escapeHtml(user.college || "No College")}</span></td>
              <td style="text-align:center;font-family:'JetBrains Mono',monospace">${user.solvedCount || 0}</td>
              <td style="text-align:right;font-weight:800;font-family:'JetBrains Mono',monospace" class="text-accent">${user.points || 0}</td>
            </tr>`;
          })
          .join("") ||
        `<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--dash-text-muted)">No hackers found matching "${HZD.escapeHtml(searchQuery)}"</td></tr>`;
    }

    if (collegesBody) {
      const filtered = leaderboardData.colleges.filter((c) =>
        c.college.toLowerCase().includes(searchQuery)
      );

      collegesBody.innerHTML =
        filtered
          .map((col) => {
            const isUserCollege =
              col.college?.toLowerCase() === (HZD.currentUser?.college || "").toLowerCase();
            const rankClass = col.rank <= 3 ? `rank-${col.rank}` : "";
            const rankBadge = col.rank <= 3 ? `🏆 ${col.rank}` : col.rank;
            return `<tr class="${isUserCollege ? "table-row-self" : ""}">
              <td><span class="rank-badge ${rankClass}">${rankBadge}</span></td>
              <td><div class="leaderboard-user-cell">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="college-icon"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/></svg>
                <span class="user-name-span">${HZD.escapeHtml(col.college)}</span>${isUserCollege ? '<span class="you-badge">YOUR CAMPUS</span>' : ""}
              </div></td>
              <td style="text-align:center;font-family:'JetBrains Mono',monospace">${col.studentCount || 0}</td>
              <td style="text-align:center;font-family:'JetBrains Mono',monospace">${col.solvedCount || 0}</td>
              <td style="text-align:right;font-weight:800;font-family:'JetBrains Mono',monospace" class="text-accent">${col.points || 0}</td>
            </tr>`;
          })
          .join("") ||
        `<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--dash-text-muted)">No colleges found matching "${HZD.escapeHtml(searchQuery)}"</td></tr>`;
    }
  }
});
