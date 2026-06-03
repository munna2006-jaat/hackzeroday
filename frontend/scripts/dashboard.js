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
});
