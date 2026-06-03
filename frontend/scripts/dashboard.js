/* dashboard.js - Dynamic Profile Management and Animations */

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("hzd_token");
  
  // 1. Guard check: redirect to login if no token is found
  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  // DOM Elements
  const profileName = document.querySelector("#profileName");
  const profileGoal = document.querySelector("#profileGoal");
  const profileCollege = document.querySelector("#profileCollege");
  const profileStatus = document.querySelector("#profileStatus");
  const logoutBtn = document.querySelector("#logoutBtn");
  
  // 2. Fetch User profile info
  try {
    const response = await fetch("/api/auth/me", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error("Unauthorized session");
    }

    const data = await response.json();
    const user = data.user;

    // Render profile details
    if (profileName) profileName.textContent = user.name || "Hacker Student";
    if (profileGoal) profileGoal.textContent = `Goal: ${user.learningGoal || "Not specified"}`;
    if (profileCollege) profileCollege.textContent = user.college || "Self Learner";
    
    if (profileStatus) {
      if (user.emailVerified) {
        profileStatus.textContent = "Verified Student";
        profileStatus.classList.add("status-badge");
      } else {
        profileStatus.textContent = "Unverified (Verify Email)";
        profileStatus.style.color = "#ff9100";
        profileStatus.style.borderColor = "rgba(255, 145, 0, 0.3)";
        profileStatus.style.backgroundColor = "rgba(255, 145, 0, 0.05)";
      }
    }
  } catch (error) {
    console.error("[dashboard] Auth session verification failed:", error);
    localStorage.removeItem("hzd_token");
    window.location.href = "/login.html";
    return;
  }

  // 3. Tab Navigation Logic
  const tabButtons = document.querySelectorAll(".tab-btn");
  const sections = document.querySelectorAll(".roadmap-section");

  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      // Remove active states
      tabButtons.forEach(b => b.classList.remove("active"));
      sections.forEach(s => s.classList.remove("active"));

      // Add active state to clicked tab
      btn.classList.add("active");
      const targetSection = document.getElementById(btn.dataset.target);
      if (targetSection) {
        targetSection.classList.add("active");
      }
    });
  });

  // 4. Animate Circular Progress Circles on Cards
  function animateProgressCircles() {
    document.querySelectorAll(".roadmap-card").forEach(card => {
      const progress = parseInt(card.dataset.progress || "0", 10);
      const circle = card.querySelector(".val-circle");
      
      if (circle) {
        const radius = 14;
        const circumference = 2 * Math.PI * radius; // 87.96 -> 88
        
        // Initial setup (hidden offset)
        circle.style.strokeDashoffset = circumference;
        
        // Animate to actual value
        setTimeout(() => {
          const offset = circumference - (progress / 100) * circumference;
          circle.style.strokeDashoffset = offset;
        }, 150);
      }
    });
  }

  animateProgressCircles();

  // 5. Handle Logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.removeItem("hzd_token");
      window.location.href = "/index.html";
    });
  }

  // 6. Interactive Cursor Glow
  const glow = document.querySelector(".cursor-glow");
  if (glow) {
    window.addEventListener("pointermove", (event) => {
      glow.style.left = `${event.clientX}px`;
      glow.style.top = `${event.clientY}px`;
    });
  }
});
