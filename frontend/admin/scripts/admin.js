/* HackZeroDay Admin — shared utilities */

const Admin = {
  DEV_KEY_STORAGE: "hzd_admin_dev_key",

  escapeHtml(value) {
    return value
      ? String(value)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;")
      : "";
  },

  getDevKey() {
    let key = localStorage.getItem(this.DEV_KEY_STORAGE);
    if (!key) {
      key = prompt(
        "Enter Admin Dev Key (default: hackzeroday-dev).\nSet ADMIN_DEV_KEY in backend .env to match.",
        "hackzeroday-dev"
      );
      if (key) {
        localStorage.setItem(this.DEV_KEY_STORAGE, key.trim());
        return key.trim();
      }
      return "hackzeroday-dev";
    }
    return key;
  },

  setDevKey(key) {
    localStorage.setItem(this.DEV_KEY_STORAGE, key);
  },

  showToast(message, type = "success") {
    let toast = document.getElementById("adminToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "adminToast";
      toast.className = "admin-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = `admin-toast visible ${type}`;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => toast.classList.remove("visible"), 4000);
  },

  async api(path, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      "x-admin-dev-key": this.getDevKey(),
      ...(options.headers || {})
    };

    const token = localStorage.getItem("hzd_token");
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(path, { ...options, headers });
    let data = null;

    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const message = data?.message || `Request failed (${response.status})`;
      throw new Error(message);
    }

    return data;
  },

  badgeStatus(status) {
    const cls = status === "PUBLISHED" ? "badge-published" : "badge-draft";
    return `<span class="badge ${cls}">${Admin.escapeHtml(status)}</span>`;
  },

  badgeDifficulty(value) {
    const map = {
      easy: "badge-easy",
      medium: "badge-medium",
      hard: "badge-hard",
      beginner: "badge-beginner",
      intermediate: "badge-intermediate",
      advanced: "badge-advanced"
    };
    const cls = map[value] || "badge-draft";
    return `<span class="badge ${cls}">${Admin.escapeHtml(value)}</span>`;
  },

  initShell(activePage) {
    document.querySelectorAll(".admin-nav a").forEach((link) => {
      if (link.dataset.page === activePage) {
        link.classList.add("active");
      }
    });

    const banner = document.getElementById("devKeyBanner");
    if (banner) {
      banner.classList.add("visible");
      banner.innerHTML = `Dev mode: using <code>x-admin-dev-key</code> header. Admin login coming in a later phase. <button type="button" class="btn btn-ghost btn-sm" id="changeDevKeyBtn">Change key</button>`;
      document.getElementById("changeDevKeyBtn")?.addEventListener("click", () => {
        const next = prompt("Enter new admin dev key:", this.getDevKey());
        if (next) {
          this.setDevKey(next.trim());
          this.showToast("Dev key updated.");
        }
      });
    }
  },

  confirmDelete(label) {
    return window.confirm(`Delete "${label}"? This cannot be undone.`);
  }
};

window.Admin = Admin;
