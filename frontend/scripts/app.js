/* ===================================================================
   app.js - HackZeroDay Shared App Shell
   Auth guard, top navigation, user stats, theme, utilities
   =================================================================== */

const HZD = {
  token: null,
  currentUser: null,

  NAV_ITEMS: [
    { id: "paths", label: "Learning Paths", href: "dashboard.html", group: "Learn" },
    { id: "rooms", label: "Rooms", href: "rooms.html", group: "Learn" },
    { id: "practice", label: "Practice", href: "practice.html", group: "Learn" },
    { id: "ctf", label: "Campus CTF", href: "ctf.html", group: "Compete" },
    { id: "leaderboard", label: "Leaderboard", href: "leaderboard.html", group: "Compete" },
  ],

  escapeHtml(unsafe) {
    return unsafe
      ? String(unsafe)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;")
      : "";
  },

  showToast(message, type = "success") {
    let toast = document.getElementById("cyberToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "cyberToast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = `cyber-toast visible ${type}`;
    setTimeout(() => toast.classList.remove("visible"), 4000);
  },

  setTheme(theme) {
    document.documentElement.className = "";
    if (theme && theme !== "green") {
      document.documentElement.classList.add(`theme-${theme}`);
    }
    localStorage.setItem("hzd_theme", theme || "green");
  },

  loadTheme() {
    const saved = localStorage.getItem("hzd_theme") || "green";
    this.setTheme(saved);
    return saved;
  },

  async requireAuth() {
    this.token = localStorage.getItem("hzd_token");
    if (!this.token) {
      window.location.href = "/login.html";
      return false;
    }
    return true;
  },

  async fetchMe() {
    const response = await fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!response.ok) throw new Error("Unauthorized session");
    const data = await response.json();
    this.currentUser = data.user;
    return this.currentUser;
  },

  updateTopbarStats() {
    const user = this.currentUser;
    if (!user) return;

    const levelVal = Math.floor((user.points || 0) / 100) + 1;
    const initial = (user.name || "H").charAt(0).toUpperCase();

    const topbarLevel = document.querySelector("#topbarLevel .stat-number");
    const topbarStreak = document.querySelector("#topbarStreak .stat-number");
    const topbarRank = document.querySelector("#topbarRank .stat-number");
    const topbarAvatar = document.getElementById("topbarAvatar");
    const navAvatar = document.getElementById("navUserAvatar");

    if (topbarLevel) topbarLevel.textContent = levelVal;
    if (topbarStreak) topbarStreak.textContent = user.streak ?? 3;
    if (topbarAvatar) topbarAvatar.textContent = initial;
    if (navAvatar) navAvatar.textContent = initial;

    this.loadUserRank(topbarRank);
  },

  async loadUserRank(rankEl) {
    try {
      const response = await fetch("/api/users/leaderboard", {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (!response.ok) return;
      const data = await response.json();
      const globalRank = data.global.find((u) => u.id === this.currentUser?.id);
      const rankVal = globalRank ? `#${globalRank.rank}` : "—";
      if (rankEl) rankEl.textContent = rankVal;
      const profileRank = document.getElementById("profileRank");
      if (profileRank) profileRank.textContent = rankVal;
    } catch (err) {
      console.error("[app] Error loading rank:", err);
    }
  },

  renderNavbar(activePage) {
    const mount = document.getElementById("dash-navbar");
    if (!mount) return;

    const navLinks = this.NAV_ITEMS.map(
      (item) =>
        `<a href="${item.href}" class="dash-nav-link${item.id === activePage ? " active" : ""}" data-nav="${item.id}">${item.label}</a>`
    ).join("");

    mount.innerHTML = `
      <header class="dash-navbar" id="dashNavbar">
        <div class="dash-navbar-inner">
          <a href="dashboard.html" class="dash-brand">
            <img src="assets/logo.svg" alt="" class="dash-brand-img" />
            <span>HackZeroDay</span>
          </a>

          <button class="dash-mobile-toggle" id="mobileMenuBtn" aria-label="Toggle navigation" aria-expanded="false">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>

          <nav class="dash-nav" id="dashNav" aria-label="Platform navigation">
            ${navLinks}
          </nav>

          <div class="dash-nav-right">
            <div class="topbar-stat" id="topbarLevel">
              <span class="stat-number">0</span>
              <span class="stat-text">Level</span>
            </div>
            <div class="topbar-stat" id="topbarStreak">
              <span class="stat-number">0</span>
              <span class="stat-text">Streak</span>
            </div>
            <div class="topbar-stat" id="topbarRank">
              <span class="stat-number">—</span>
              <span class="stat-text">Rank</span>
            </div>

            <div class="dash-user-menu" id="userMenu">
              <button class="dash-user-trigger" id="userMenuBtn" aria-haspopup="true" aria-expanded="false" aria-label="Account menu">
                <span class="topbar-avatar" id="navUserAvatar" title="Account">?</span>
                <svg class="dash-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="dash-user-dropdown" id="userDropdown">
                <a href="profile.html" class="dash-dropdown-link${activePage === "profile" ? " active" : ""}">My Profile</a>
                <a href="settings.html" class="dash-dropdown-link${activePage === "settings" ? " active" : ""}">Settings</a>
                <button type="button" class="dash-dropdown-link dash-logout" id="logoutBtn">Log Out</button>
              </div>
            </div>
          </div>
        </div>
      </header>
    `;

    this.initMobileNav();
    this.initUserMenu();
    this.initLogout();
  },

  initMobileNav() {
    const btn = document.getElementById("mobileMenuBtn");
    const nav = document.getElementById("dashNav");
    if (!btn || !nav) return;

    btn.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(open));
    });

    document.addEventListener("click", (e) => {
      if (!nav.contains(e.target) && !btn.contains(e.target)) {
        nav.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
      }
    });
  },

  initUserMenu() {
    const trigger = document.getElementById("userMenuBtn");
    const menu = document.getElementById("userMenu");
    if (!trigger || !menu) return;

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = menu.classList.toggle("open");
      trigger.setAttribute("aria-expanded", String(open));
    });

    document.addEventListener("click", () => {
      menu.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");
    });
  },

  initLogout() {
    const logoutBtn = document.getElementById("logoutBtn");
    if (!logoutBtn) return;
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("hzd_token");
      window.location.href = "/index.html";
    });
  },

  setPageGreeting() {
    const user = this.currentUser;
    if (!user) return;
    const firstName = (user.name || "Hacker").split(" ")[0];
    const greetingText = document.getElementById("greetingText");
    const greetingSubtext = document.getElementById("greetingSubtext");
    if (greetingText) greetingText.textContent = `Welcome back, ${firstName}`;
    if (greetingSubtext) greetingSubtext.textContent = "Continue your hacking journey";
  },

  async init() {
    const activePage = document.body.dataset.page || "paths";
    this.loadTheme();
    this.renderNavbar(activePage);

    const authed = await this.requireAuth();
    if (!authed) return;

    try {
      await this.fetchMe();
      this.updateTopbarStats();
      this.setPageGreeting();
    } catch (err) {
      console.error("[app] Auth verification failed:", err);
      localStorage.removeItem("hzd_token");
      window.location.href = "/login.html";
      return false;
    }

    document.dispatchEvent(new CustomEvent("hzd:ready"));
    return true;
  },
};

window.HZD = HZD;

document.addEventListener("DOMContentLoaded", () => {
  HZD.init();
});

window.onHZDReady = (fn) => {
  if (HZD.currentUser) fn();
  else document.addEventListener("hzd:ready", fn, { once: true });
};
