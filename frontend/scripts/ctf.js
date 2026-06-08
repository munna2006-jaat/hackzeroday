/* ctf.js - Campus CTF page */

onHZDReady(() => {

  const token = HZD.token;

  const ctfTabBtns = document.querySelectorAll(".ctf-tab-btn");
  ctfTabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      ctfTabBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const tab = btn.dataset.ctfTab;
      document.getElementById("panelInCampus")?.classList.toggle("hidden", tab !== "in-campus");
      document.getElementById("panelCollegeVsCollege")?.classList.toggle("hidden", tab !== "college-vs-college");
    });
  });

  loadCTFData();

  async function loadCTFData() {
    try {
      const response = await fetch("/api/users/ctfs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to load CTF data");
      const data = await response.json();

      const collegeAlertBanner = document.getElementById("collegeAlertBanner");
      const collegeInfoBanner = document.getElementById("collegeInfoBanner");
      const currentUserCollegeText = document.getElementById("currentUserCollegeText");

      if (data.hasCollege) {
        collegeAlertBanner?.classList.add("hidden");
        collegeInfoBanner?.classList.remove("hidden");
        if (currentUserCollegeText && HZD.currentUser) {
          currentUserCollegeText.textContent = HZD.currentUser.college;
        }
      } else {
        collegeAlertBanner?.classList.remove("hidden");
        collegeInfoBanner?.classList.add("hidden");
      }

      renderCtfGrid(data.inCampus, "inCampusGrid");
      renderCtfGrid(data.collegeVsCollege, "collegeVsCollegeGrid");
    } catch (err) {
      console.error("[ctf] Load error:", err);
    }
  }

  function renderCtfGrid(ctfList, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!ctfList?.length) {
      container.innerHTML = `
        <div class="no-events-placeholder">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity: 0.4;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <p>No active or scheduled CTF matches for this section.</p>
          <span class="empty-hint">Check back soon — new campus events are added regularly.</span>
        </div>`;
      return;
    }

    container.innerHTML = ctfList.map((ctf) => buildCtfCard(ctf)).join("");
    bindCtfActions(container);
  }

  function buildCtfCard(ctf) {
    const difficultyClass = ctf.difficulty.toLowerCase().includes("beginner")
      ? "beginner"
      : ctf.difficulty.toLowerCase().includes("advanced")
        ? "advanced"
        : "intermediate";
    const badgeText = ctf.status === "active" ? "● Live Now" : "Upcoming";
    const badgeClass = ctf.status === "active" ? "status-live" : "status-upcoming";
    const btnText = ctf.registered ? "Registered" : "Register Now";
    const btnClass = ctf.registered ? "cyber-btn-registered" : "cyber-btn-action";
    const team = ctf.team;

    const teamBlock = team
      ? `<div class="ctf-team-panel team-active">
          <div class="team-panel-head"><span class="team-label">Your Team</span><strong>${HZD.escapeHtml(team.teamName)}</strong></div>
          <div class="team-meta-grid">
            <span><b>${team.memberCount}/${team.maxMembers}</b> Members</span>
            <span><b>${team.isCaptain ? "Captain" : "Member"}</b> Role</span>
          </div>
          <label class="invite-code-box">Invite Code<input value="${HZD.escapeHtml(team.inviteCode)}" readonly /></label>
        </div>`
      : `<div class="ctf-team-panel">
          <div class="team-panel-head"><span class="team-label">Team Registration</span>
          <strong>${ctf.type === "college-vs-college" ? "Official college squad" : "Campus practice team"}</strong></div>
          <div class="team-action-grid">
            <label>Team name<input class="team-name-input" data-ctf-id="${ctf.id}" placeholder="e.g. NullSec Falcons" /></label>
            <button class="team-create-btn" data-ctf-id="${ctf.id}" type="button">Create Team</button>
          </div>
          <div class="team-action-grid">
            <label>Invite code<input class="team-code-input" data-ctf-id="${ctf.id}" placeholder="HZD-ABC123" /></label>
            <button class="team-join-btn" data-ctf-id="${ctf.id}" type="button">Join Team</button>
          </div>
        </div>`;

    return `
      <article class="ctf-card ${ctf.status === "active" ? "active-event" : ""}">
        <div class="ctf-card-header">
          <span class="ctf-status-badge ${badgeClass}">${badgeText}</span>
          <span class="ctf-format-badge">${ctf.format}</span>
        </div>
        <div class="ctf-card-body">
          <h3>${HZD.escapeHtml(ctf.title)}</h3>
          ${ctf.matchup ? `<div class="ctf-matchup">${HZD.escapeHtml(ctf.matchup)}</div>` : ""}
          <div class="ctf-meta-stats">
            <div class="ctf-stat"><span class="lbl">Date</span><span class="val">${ctf.date}</span></div>
            <div class="ctf-stat"><span class="lbl">Duration</span><span class="val">${ctf.duration}</span></div>
            <div class="ctf-stat"><span class="lbl">Difficulty</span><span class="val difficulty-${difficultyClass}">${ctf.difficulty}</span></div>
          </div>
          <div class="ctf-challenge-summary">
            <span><strong>${ctf.challengesCount}</strong> Challenges</span>
            <span><strong>${ctf.points}</strong> Points</span>
            <span><strong>${ctf.registrationCount}</strong> Registered</span>
          </div>
          ${teamBlock}
        </div>
        <div class="ctf-card-footer">
          <button class="ctf-register-btn ${btnClass}" data-ctf-id="${ctf.id}"><span>${btnText}</span></button>
        </div>
      </article>`;
  }

  function bindCtfActions(container) {
    container.querySelectorAll(".team-create-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const ctfId = btn.dataset.ctfId;
        const input = container.querySelector(`.team-name-input[data-ctf-id="${ctfId}"]`);
        const teamName = input?.value.trim();
        if (!teamName) return HZD.showToast("Enter a team name first.", "error");
        try {
          const res = await fetch(`/api/users/ctfs/${ctfId}/team`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ teamName }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || "Failed to create team.");
          await loadCTFData();
          HZD.showToast(`${data.message} Code: ${data.team.inviteCode}`);
        } catch (err) {
          HZD.showToast(err.message, "error");
        }
      });
    });

    container.querySelectorAll(".team-join-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const ctfId = btn.dataset.ctfId;
        const input = container.querySelector(`.team-code-input[data-ctf-id="${ctfId}"]`);
        const inviteCode = input?.value.trim().toUpperCase();
        if (!inviteCode) return HZD.showToast("Enter an invite code first.", "error");
        try {
          const res = await fetch(`/api/users/ctfs/${ctfId}/team/join`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ inviteCode }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || "Failed to join team.");
          await loadCTFData();
          HZD.showToast(data.message);
        } catch (err) {
          HZD.showToast(err.message, "error");
        }
      });
    });

    container.querySelectorAll(".ctf-register-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const ctfId = btn.dataset.ctfId;
        try {
          const res = await fetch(`/api/users/ctfs/${ctfId}/register`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (res.ok) {
            await loadCTFData();
            HZD.updateTopbarStats();
            HZD.showToast(data.message);
          } else {
            HZD.showToast(data.message, "error");
          }
        } catch {
          HZD.showToast("Network error registering for CTF.", "error");
        }
      });
    });
  }
});
