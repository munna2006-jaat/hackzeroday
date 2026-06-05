/* ===================================================================
   dashboard.js - HackZeroDay Dashboard Controller
   Handles auth, profile rendering, filtering, and sidebar toggle
   =================================================================== */

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("hzd_token");

  // 1. Auth guard - redirect if not logged in
  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  // ---- DOM References ----
  const greetingText = document.getElementById("greetingText");
  const greetingSubtext = document.getElementById("greetingSubtext");
  const topbarAvatar = document.getElementById("topbarAvatar");
  const logoutBtn = document.getElementById("logoutBtn");
  const mobileMenuBtn = document.getElementById("mobileMenuBtn");
  const sidebar = document.getElementById("sidebar");
  const pathFilters = document.getElementById("pathFilters");
  const pathsGrid = document.getElementById("pathsGrid");

  // 2. Fetch user profile
  try {
    const response = await fetch("/api/auth/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Unauthorized session");
    }

    const data = await response.json();
    const user = data.user;

    // Render greeting
    const firstName = (user.name || "Hacker").split(" ")[0];
    if (greetingText) {
      greetingText.textContent = `Welcome back, ${firstName}`;
    }
    if (greetingSubtext) {
      greetingSubtext.textContent = "Continue your hacking journey";
    }

    // Avatar initial
    if (topbarAvatar) {
      topbarAvatar.textContent = firstName.charAt(0).toUpperCase();
    }
  } catch (error) {
    console.error("[dashboard] Auth verification failed:", error);
    localStorage.removeItem("hzd_token");
    window.location.href = "/login.html";
    return;
  }

  // 3. Path Filter Logic
  if (pathFilters && pathsGrid) {
    const filterBtns = pathFilters.querySelectorAll(".filter-btn");
    const pathCards = pathsGrid.querySelectorAll(".path-card-lg");

    filterBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        // Update active state
        filterBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        const filter = btn.dataset.filter;

        pathCards.forEach((card) => {
          if (filter === "all" || card.dataset.level === filter) {
            card.classList.remove("hidden");
          } else {
            card.classList.add("hidden");
          }
        });
      });
    });
  }

  // 4. Mobile Sidebar Toggle
  let overlay = document.querySelector(".sidebar-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "sidebar-overlay";
    document.body.appendChild(overlay);
  }

  function openSidebar() {
    if (sidebar) sidebar.classList.add("open");
    overlay.classList.add("visible");
    document.body.style.overflow = "hidden";
  }

  function closeSidebar() {
    if (sidebar) sidebar.classList.remove("open");
    overlay.classList.remove("visible");
    document.body.style.overflow = "";
  }

  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener("click", () => {
      if (sidebar && sidebar.classList.contains("open")) {
        closeSidebar();
      } else {
        openSidebar();
      }
    });
  }

  overlay.addEventListener("click", closeSidebar);

  // Close sidebar on window resize to desktop
  window.addEventListener("resize", () => {
    if (window.innerWidth > 1024) {
      closeSidebar();
    }
  });

  // 5. Handle Logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.removeItem("hzd_token");
      window.location.href = "/index.html";
    });
  }

  // 6. Animate progress bars on scroll (IntersectionObserver)
  const progressBars = document.querySelectorAll(".progress-fill");
  if (progressBars.length > 0 && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Progress is set via inline style width; the CSS transition handles animation
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );

    progressBars.forEach((bar) => observer.observe(bar));
  }

  // ===================================================================
  // 7. SPA Routing System
  // ===================================================================
  const sections = {
    paths: document.getElementById("sectionPaths"),
    ctf: document.getElementById("sectionCTF"),
    leaderboard: document.getElementById("sectionLeaderboard"),
    profile: document.getElementById("sectionProfile"),
    settings: document.getElementById("sectionSettings")
  };

  const navLinks = {
    paths: document.getElementById("navLearningPaths"),
    ctf: document.getElementById("navCTF"),
    leaderboard: document.getElementById("navLeaderboard"),
    profile: document.getElementById("navProfile"),
    settings: document.getElementById("navSettings")
  };

  function showSection(sectionKey) {
    Object.keys(sections).forEach((key) => {
      if (sections[key]) sections[key].classList.add("hidden");
      if (navLinks[key]) navLinks[key].classList.remove("active");
    });

    if (sections[sectionKey]) sections[sectionKey].classList.remove("hidden");
    if (navLinks[sectionKey]) navLinks[sectionKey].classList.add("active");

    closeSidebar();

    if (sectionKey === "profile" || sectionKey === "settings") {
      loadUserProfileData();
    } else if (sectionKey === "leaderboard") {
      loadLeaderboardData();
    } else if (sectionKey === "ctf") {
      loadCTFData();
    }
  }

  Object.keys(navLinks).forEach((key) => {
    if (navLinks[key]) {
      navLinks[key].addEventListener("click", (e) => {
        e.preventDefault();
        showSection(key);
        history.pushState(null, "", `#${key}`);
      });
    }
  });

  // Handle initial hash load
  const initialHash = window.location.hash.slice(1);
  if (initialHash && sections[initialHash]) {
    showSection(initialHash);
  } else {
    showSection("paths");
  }

  window.addEventListener("popstate", () => {
    const hash = window.location.hash.slice(1);
    if (hash && sections[hash]) {
      showSection(hash);
    } else {
      showSection("paths");
    }
  });

  // ===================================================================
  // 8. User Profile & Topbar Synchronization
  // ===================================================================
  let currentUser = null;

  async function loadUserProfileData() {
    try {
      const response = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Session expired");
      const data = await response.json();
      currentUser = data.user;

      updateTopbarStats();

      // Set profile details card values
      const profilePoints = document.getElementById("profilePoints");
      const profileStreak = document.getElementById("profileStreak");
      const profileSolved = document.getElementById("profileSolved");
      const profileNameText = document.getElementById("profileNameText");
      const profileEmailText = document.getElementById("profileEmailText");
      const profileAvatarLarge = document.getElementById("profileAvatarLarge");

      const inputName = document.getElementById("profileInputName");
      const inputCollege = document.getElementById("profileInputCollege");
      const inputGoal = document.getElementById("profileInputGoal");

      if (profilePoints) profilePoints.textContent = currentUser.points || 0;
      if (profileStreak) profileStreak.textContent = "3"; // Hardcoded default streak
      if (profileSolved) profileSolved.textContent = currentUser.solvedCount || 0;
      if (profileNameText) profileNameText.textContent = currentUser.name || "Anonymous Hacker";
      if (profileEmailText) profileEmailText.textContent = currentUser.email;

      const initial = (currentUser.name || "H").charAt(0).toUpperCase();
      if (profileAvatarLarge) profileAvatarLarge.textContent = initial;

      if (inputName) inputName.value = currentUser.name || "";
      if (inputCollege) inputCollege.value = currentUser.college || "";
      if (inputGoal) inputGoal.value = currentUser.learningGoal || "";

      loadUserRank();
    } catch (err) {
      console.error("[dashboard] Failed to load user profile:", err);
    }
  }

  function updateTopbarStats() {
    if (!currentUser) return;
    const levelVal = Math.floor((currentUser.points || 0) / 100) + 1;

    const topbarLevel = document.querySelector("#topbarLevel .stat-number");
    const topbarStreak = document.querySelector("#topbarStreak .stat-number");
    const topbarAvatar = document.getElementById("topbarAvatar");

    if (topbarLevel) topbarLevel.textContent = levelVal;
    if (topbarStreak) topbarStreak.textContent = "3";
    if (topbarAvatar) {
      const initial = (currentUser.name || "H").charAt(0).toUpperCase();
      topbarAvatar.textContent = initial;
    }
  }

  async function loadUserRank() {
    try {
      const response = await fetch("/api/users/leaderboard", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const globalRank = data.global.find((u) => u.id === currentUser.id);
        const rankVal = globalRank ? `#${globalRank.rank}` : "—";

        const topbarRank = document.querySelector("#topbarRank .stat-number");
        const profileRank = document.getElementById("profileRank");

        if (topbarRank) topbarRank.textContent = rankVal;
        if (profileRank) profileRank.textContent = rankVal;
      }
    } catch (err) {
      console.error("[dashboard] Error loading user rank:", err);
    }
  }

  // Auto load profile statistics on startup
  loadUserProfileData();

  // ===================================================================
  // 9. Profile Settings Update Form
  // ===================================================================
  const editProfileForm = document.getElementById("editProfileForm");
  const profileFormMessage = document.getElementById("profileFormMessage");

  if (editProfileForm) {
    editProfileForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = document.getElementById("profileInputName").value;
      const college = document.getElementById("profileInputCollege").value;
      const learningGoal = document.getElementById("profileInputGoal").value;

      try {
        const response = await fetch("/api/users/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ name, college, learningGoal })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to update profile.");
        }

        profileFormMessage.textContent = data.message;
        profileFormMessage.className = "form-message success";

        currentUser = data.user;
        updateTopbarStats();

        const profileNameText = document.getElementById("profileNameText");
        const profileAvatarLarge = document.getElementById("profileAvatarLarge");
        if (profileNameText) profileNameText.textContent = currentUser.name || "Anonymous Hacker";
        if (profileAvatarLarge) profileAvatarLarge.textContent = (currentUser.name || "H").charAt(0).toUpperCase();

        // If CTF panel is loaded, refresh it too to fetch correct campus events
        if (!sections.ctf.classList.contains("hidden")) {
          loadCTFData();
        }

        setTimeout(() => {
          profileFormMessage.textContent = "";
          profileFormMessage.className = "form-message";
        }, 3000);
      } catch (err) {
        profileFormMessage.textContent = err.message;
        profileFormMessage.className = "form-message error";
      }
    });
  }

  // ===================================================================
  // 10. Security Settings Form (Change Password)
  // ===================================================================
  const changePasswordForm = document.getElementById("changePasswordForm");
  const settingsFormMessage = document.getElementById("settingsFormMessage");

  if (changePasswordForm) {
    changePasswordForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const oldPassword = document.getElementById("inputOldPassword").value;
      const newPassword = document.getElementById("inputNewPassword").value;
      const confirmPassword = document.getElementById("inputConfirmPassword").value;

      if (newPassword !== confirmPassword) {
        settingsFormMessage.textContent = "New passwords do not match.";
        settingsFormMessage.className = "form-message error";
        return;
      }

      try {
        const response = await fetch("/api/users/change-password", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ oldPassword, newPassword })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to update password.");
        }

        settingsFormMessage.textContent = data.message;
        settingsFormMessage.className = "form-message success";
        changePasswordForm.reset();

        setTimeout(() => {
          settingsFormMessage.textContent = "";
          settingsFormMessage.className = "form-message";
        }, 3000);
      } catch (err) {
        settingsFormMessage.textContent = err.message;
        settingsFormMessage.className = "form-message error";
      }
    });
  }

  // ===================================================================
  // 11. Theme Selection & Danger Zone
  // ===================================================================
  const themeBtns = document.querySelectorAll(".theme-btn");

  themeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      themeBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const theme = btn.dataset.theme;
      setTheme(theme);
    });
  });

  function setTheme(theme) {
    document.documentElement.className = "";
    if (theme !== "green") {
      document.documentElement.classList.add(`theme-${theme}`);
    }
    localStorage.setItem("hzd_theme", theme);
  }

  const savedTheme = localStorage.getItem("hzd_theme") || "green";
  const matchingThemeBtn = document.querySelector(`.theme-btn[data-theme="${savedTheme}"]`);
  if (matchingThemeBtn) {
    themeBtns.forEach((b) => b.classList.remove("active"));
    matchingThemeBtn.classList.add("active");
  }
  setTheme(savedTheme);

  const btnDeleteAccount = document.getElementById("btnDeleteAccount");
  if (btnDeleteAccount) {
    btnDeleteAccount.addEventListener("click", async () => {
      const confirmDelete = confirm("WARNING: Are you absolutely sure you want to delete your account permanently? All stats will be lost.");
      if (confirmDelete) {
        try {
          const response = await fetch("/api/users/delete-account", {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
          });
          if (response.ok) {
            alert("Your account has been deleted.");
            localStorage.removeItem("hzd_token");
            window.location.href = "/index.html";
          } else {
            const data = await response.json();
            alert(data.message || "Failed to delete account.");
          }
        } catch (err) {
          alert("An error occurred: " + err.message);
        }
      }
    });
  }

  // ===================================================================
  // 12. Leaderboard Controller
  // ===================================================================
  let leaderboardData = { global: [], colleges: [] };
  const leaderboardSearch = document.getElementById("leaderboardSearch");

  const leaderTabBtns = document.querySelectorAll(".leader-tab-btn");
  leaderTabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      leaderTabBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const tab = btn.dataset.leaderTab;
      document.getElementById("panelLeaderGlobal").classList.add("hidden");
      document.getElementById("panelLeaderColleges").classList.add("hidden");

      if (tab === "global") {
        document.getElementById("panelLeaderGlobal").classList.remove("hidden");
      } else {
        document.getElementById("panelLeaderColleges").classList.remove("hidden");
      }
      renderLeaderboards();
    });
  });

  async function loadLeaderboardData() {
    try {
      const response = await fetch("/api/users/leaderboard", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Failed to load leaderboard");
      leaderboardData = await response.json();
      renderLeaderboards();
    } catch (err) {
      console.error("[dashboard] Leaderboard load error:", err);
    }
  }

  function renderLeaderboards() {
    const searchQuery = (leaderboardSearch?.value || "").toLowerCase().trim();

    // Render Global Users Table
    const globalBody = document.getElementById("leaderGlobalBody");
    if (globalBody) {
      const filteredGlobal = leaderboardData.global.filter(
        (user) =>
          user.name.toLowerCase().includes(searchQuery) ||
          (user.college && user.college.toLowerCase().includes(searchQuery))
      );

      globalBody.innerHTML =
        filteredGlobal
          .map((user) => {
            const isSelf = currentUser && user.id === currentUser.id;
            const rankClass = user.rank === 1 ? "rank-1" : user.rank === 2 ? "rank-2" : user.rank === 3 ? "rank-3" : "";
            const rankBadge = user.rank <= 3 ? `👑 ${user.rank}` : user.rank;

            return `
          <tr class="${isSelf ? "table-row-self" : ""}">
            <td><span class="rank-badge ${rankClass}">${rankBadge}</span></td>
            <td>
              <div class="leaderboard-user-cell">
                <div class="user-avatar-mini">${user.name.charAt(0).toUpperCase()}</div>
                <div>
                  <span class="user-name-span">${escapeHtml(user.name)}</span>
                  ${isSelf ? '<span class="you-badge">YOU</span>' : ""}
                </div>
              </div>
            </td>
            <td><span class="table-college-span">${escapeHtml(user.college || "No College")}</span></td>
            <td style="text-align: center; font-family: 'JetBrains Mono', monospace;">${user.solvedCount || 0}</td>
            <td style="text-align: right; font-weight: 800; font-family: 'JetBrains Mono', monospace;" class="text-accent">${user.points || 0}</td>
          </tr>
        `;
          })
          .join("") || `<tr><td colspan="5" style="text-align: center; padding: 30px; color: var(--dash-text-muted);">No hackers found matching "${escapeHtml(searchQuery)}"</td></tr>`;
    }

    // Render Colleges Table
    const collegesBody = document.getElementById("leaderCollegesBody");
    if (collegesBody) {
      const filteredColleges = leaderboardData.colleges.filter((col) => col.college.toLowerCase().includes(searchQuery));

      collegesBody.innerHTML =
        filteredColleges
          .map((col) => {
            const isUserCollege = currentUser && col.college && col.college.toLowerCase() === (currentUser.college || "").toLowerCase();
            const rankClass = col.rank === 1 ? "rank-1" : col.rank === 2 ? "rank-2" : col.rank === 3 ? "rank-3" : "";
            const rankBadge = col.rank <= 3 ? `🏆 ${col.rank}` : col.rank;

            return `
          <tr class="${isUserCollege ? "table-row-self" : ""}">
            <td><span class="rank-badge ${rankClass}">${rankBadge}</span></td>
            <td>
              <div class="leaderboard-user-cell">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="college-icon"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/></svg>
                <span class="user-name-span">${escapeHtml(col.college)}</span>
                ${isUserCollege ? '<span class="you-badge">YOUR CAMPUS</span>' : ""}
              </div>
            </td>
            <td style="text-align: center; font-family: 'JetBrains Mono', monospace;">${col.studentCount || 0}</td>
            <td style="text-align: center; font-family: 'JetBrains Mono', monospace;">${col.solvedCount || 0}</td>
            <td style="text-align: right; font-weight: 800; font-family: 'JetBrains Mono', monospace;" class="text-accent">${col.points || 0}</td>
          </tr>
        `;
          })
          .join("") || `<tr><td colspan="5" style="text-align: center; padding: 30px; color: var(--dash-text-muted);">No colleges found matching "${escapeHtml(searchQuery)}"</td></tr>`;
    }
  }

  if (leaderboardSearch) {
    leaderboardSearch.addEventListener("input", renderLeaderboards);
  }

  function escapeHtml(unsafe) {
    return unsafe
      ? unsafe
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;")
      : "";
  }

  // ===================================================================
  // 13. Campus CTF Controller (In-Campus vs College vs College)
  // ===================================================================
  const ctfTabBtns = document.querySelectorAll(".ctf-tab-btn");
  ctfTabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      ctfTabBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const tab = btn.dataset.ctfTab;
      document.getElementById("panelInCampus").classList.add("hidden");
      document.getElementById("panelCollegeVsCollege").classList.add("hidden");

      if (tab === "in-campus") {
        document.getElementById("panelInCampus").classList.remove("hidden");
      } else {
        document.getElementById("panelCollegeVsCollege").classList.remove("hidden");
      }
    });
  });

  const linkToSettings = document.getElementById("linkToSettings");
  const linkToProfile = document.getElementById("linkToProfile");
  if (linkToSettings) {
    linkToSettings.addEventListener("click", (e) => {
      e.preventDefault();
      showSection("settings");
    });
  }
  if (linkToProfile) {
    linkToProfile.addEventListener("click", (e) => {
      e.preventDefault();
      showSection("profile");
    });
  }

  async function loadCTFData() {
    try {
      const response = await fetch("/api/users/ctfs", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Failed to load CTF data");
      const data = await response.json();

      const collegeAlertBanner = document.getElementById("collegeAlertBanner");
      const collegeInfoBanner = document.getElementById("collegeInfoBanner");
      const currentUserCollegeText = document.getElementById("currentUserCollegeText");

      if (data.hasCollege) {
        collegeAlertBanner?.classList.add("hidden");
        collegeInfoBanner?.classList.remove("hidden");
        if (currentUserCollegeText && currentUser) {
          currentUserCollegeText.textContent = currentUser.college;
        }
      } else {
        collegeAlertBanner?.classList.remove("hidden");
        collegeInfoBanner?.classList.add("hidden");
      }

      renderCtfGrid(data.inCampus, "inCampusGrid");
      renderCtfGrid(data.collegeVsCollege, "collegeVsCollegeGrid");
    } catch (err) {
      console.error("[dashboard] CTF load error:", err);
    }
  }

  function renderCtfGrid(ctfList, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!ctfList || ctfList.length === 0) {
      container.innerHTML = `
        <div class="no-events-placeholder">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity: 0.4;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <p>No active or scheduled CTF matches for this section.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = ctfList
      .map((ctf) => {
        const difficultyClass = ctf.difficulty.toLowerCase().includes("beginner") ? "beginner" : ctf.difficulty.toLowerCase().includes("advanced") ? "advanced" : "intermediate";
        const badgeText = ctf.status === "active" ? "● Live Now" : "Upcoming";
        const badgeClass = ctf.status === "active" ? "status-live" : "status-upcoming";
        const btnText = ctf.registered ? "Registered" : "Register Now";
        const btnClass = ctf.registered ? "cyber-btn-registered" : "cyber-btn-action";
        const team = ctf.team;
        const teamBlock = team
          ? `
            <div class="ctf-team-panel team-active">
              <div class="team-panel-head">
                <span class="team-label">Your Team</span>
                <strong>${escapeHtml(team.teamName)}</strong>
              </div>
              <div class="team-meta-grid">
                <span><b>${team.memberCount}/${team.maxMembers}</b> Members</span>
                <span><b>${team.isCaptain ? "Captain" : "Member"}</b> Role</span>
              </div>
              <label class="invite-code-box">
                Invite Code
                <input value="${escapeHtml(team.inviteCode)}" readonly />
              </label>
            </div>
          `
          : `
            <div class="ctf-team-panel">
              <div class="team-panel-head">
                <span class="team-label">Team Registration</span>
                <strong>${ctf.type === "college-vs-college" ? "Official college squad" : "Campus practice team"}</strong>
              </div>
              <div class="team-action-grid">
                <label>
                  Team name
                  <input class="team-name-input" data-ctf-id="${ctf.id}" placeholder="e.g. NullSec Falcons" />
                </label>
                <button class="team-create-btn" data-ctf-id="${ctf.id}" type="button">Create Team</button>
              </div>
              <div class="team-action-grid">
                <label>
                  Invite code
                  <input class="team-code-input" data-ctf-id="${ctf.id}" placeholder="HZD-ABC123" />
                </label>
                <button class="team-join-btn" data-ctf-id="${ctf.id}" type="button">Join Team</button>
              </div>
            </div>
          `;

        return `
        <article class="ctf-card ${ctf.status === "active" ? "active-event" : ""}">
          <div class="ctf-card-header">
            <span class="ctf-status-badge ${badgeClass}">${badgeText}</span>
            <span class="ctf-format-badge">${ctf.format}</span>
          </div>
          
          <div class="ctf-card-body">
            <h3>${escapeHtml(ctf.title)}</h3>
            ${ctf.matchup ? `<div class="ctf-matchup">${escapeHtml(ctf.matchup)}</div>` : ""}
            
            <div class="ctf-meta-stats">
              <div class="ctf-stat">
                <span class="lbl">Date</span>
                <span class="val">${ctf.date}</span>
              </div>
              <div class="ctf-stat">
                <span class="lbl">Duration</span>
                <span class="val">${ctf.duration}</span>
              </div>
              <div class="ctf-stat">
                <span class="lbl">Difficulty</span>
                <span class="val difficulty-${difficultyClass}">${ctf.difficulty}</span>
              </div>
            </div>

            <div class="ctf-challenge-summary">
              <span><strong>${ctf.challengesCount}</strong> Challenges</span>
              <span><strong>${ctf.points}</strong> Points</span>
              <span><strong>${ctf.registrationCount}</strong> Registered</span>
            </div>

            ${teamBlock}
          </div>

          <div class="ctf-card-footer">
            <button class="ctf-register-btn ${btnClass}" data-ctf-id="${ctf.id}">
              <span>${btnText}</span>
            </button>
          </div>
        </article>
      `;
      })
      .join("");

    container.querySelectorAll(".team-create-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const ctfId = btn.dataset.ctfId;
        const input = container.querySelector(`.team-name-input[data-ctf-id="${ctfId}"]`);
        const teamName = input?.value.trim();

        if (!teamName) {
          showToast("Enter a team name first.", "error");
          return;
        }

        try {
          const response = await fetch(`/api/users/ctfs/${ctfId}/team`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ teamName })
          });
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.message || "Failed to create team.");
          }

          await loadCTFData();
          showToast(`${data.message} Code: ${data.team.inviteCode}`);
        } catch (err) {
          showToast(err.message, "error");
        }
      });
    });

    container.querySelectorAll(".team-join-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const ctfId = btn.dataset.ctfId;
        const input = container.querySelector(`.team-code-input[data-ctf-id="${ctfId}"]`);
        const inviteCode = input?.value.trim().toUpperCase();

        if (!inviteCode) {
          showToast("Enter an invite code first.", "error");
          return;
        }

        try {
          const response = await fetch(`/api/users/ctfs/${ctfId}/team/join`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ inviteCode })
          });
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.message || "Failed to join team.");
          }

          await loadCTFData();
          showToast(data.message);
        } catch (err) {
          showToast(err.message, "error");
        }
      });
    });

    container.querySelectorAll(".ctf-register-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const ctfId = btn.dataset.ctfId;
        try {
          const response = await fetch(`/api/users/ctfs/${ctfId}/register`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await response.json();
          if (response.ok) {
            await loadCTFData();
            await loadUserProfileData();
            showToast(data.message);
          } else {
            showToast(data.message, "error");
          }
        } catch (err) {
          showToast("Network error registering for CTF.", "error");
        }
      });
    });
  }

  function showToast(message, type = "success") {
    let toast = document.getElementById("cyberToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "cyberToast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = `cyber-toast visible ${type}`;

    setTimeout(() => {
      toast.classList.remove("visible");
    }, 4000);
  }
});
