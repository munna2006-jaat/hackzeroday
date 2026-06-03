// Auth Check on load
const currentToken = localStorage.getItem("hzd_token");
if (currentToken) {
  if (window.location.pathname.endsWith("login.html")) {
    window.location.href = "/dashboard.html";
  }
  
  // Update login links to point to dashboard
  document.querySelectorAll('a[href="login.html"]').forEach(btn => {
    btn.href = "/dashboard.html";
    if (btn.classList.contains("btn-ghost") || btn.textContent.trim() === "Login") {
      btn.textContent = "Dashboard";
    } else if (btn.classList.contains("btn-primary")) {
      btn.textContent = "Go to Dashboard";
    }
  });
}

const glow = document.querySelector(".cursor-glow");
const tickerTrack = document.querySelector(".ticker-track");
const authTabs = document.querySelectorAll("[data-auth-mode]");
const loginForm = document.querySelector("#loginForm");
const authMessage = document.querySelector("#authMessage");

if (glow) {
  window.addEventListener("pointermove", (event) => {
    glow.style.left = `${event.clientX}px`;
    glow.style.top = `${event.clientY}px`;
  });
}

if (tickerTrack) {
  tickerTrack.innerHTML += tickerTrack.innerHTML;
}

if (authTabs.length) {
  document.body.dataset.auth = "login";

  authTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      authTabs.forEach((item) => item.classList.remove("active"));
      tab.classList.add("active");
      document.body.dataset.auth = tab.dataset.authMode;
    });
  });
}

if (loginForm && authMessage) {
  const otpButton = loginForm.querySelector('button[type="button"].btn-dark');
  const verifyButton = loginForm.querySelector(".otp-row button");

  function setAuthMessage(message, type = "info") {
    authMessage.textContent = message;
    authMessage.dataset.type = type;
  }

  async function requestAuth(endpoint, payload) {
    const response = await fetch(`/api/auth/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Request failed.");
    }

    if (data.token) {
      localStorage.setItem("hzd_token", data.token);
    }

    return data;
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(loginForm);
    const mode = document.body.dataset.auth === "signup" ? "signup" : "login";
    const payload = {
      email: form.get("email"),
      password: form.get("password")
    };

    if (mode === "signup") {
      payload.name = form.get("name");
      payload.college = form.get("college");
      payload.learningGoal = form.get("goal");
    }

    try {
      setAuthMessage("Connecting securely...");
      const data = await requestAuth(mode, payload);
      setAuthMessage(data.message, "success");
      
      // If user is already verified, redirect immediately
      if (data.user && data.user.emailVerified) {
        setAuthMessage("Login successful! Redirecting...", "success");
        setTimeout(() => {
          window.location.href = "/dashboard.html";
        }, 1200);
      }
    } catch (error) {
      setAuthMessage(error.message, "error");
    }
  });

  otpButton?.addEventListener("click", async () => {
    const form = new FormData(loginForm);

    try {
      setAuthMessage("Sending OTP...");
      const data = await requestAuth("send-otp", {
        email: form.get("email"),
        purpose: "EMAIL_VERIFY"
      });
      setAuthMessage(data.emailPreview || data.message, "success");
    } catch (error) {
      setAuthMessage(error.message, "error");
    }
  });

  verifyButton?.addEventListener("click", async () => {
    const form = new FormData(loginForm);

    try {
      setAuthMessage("Verifying OTP...");
      const data = await requestAuth("verify-otp", {
        email: form.get("email"),
        otp: form.get("otp"),
        purpose: "EMAIL_VERIFY"
      });
      setAuthMessage("Email verified! Loading your dashboard...", "success");
      setTimeout(() => {
        window.location.href = "/dashboard.html";
      }, 1200);
    } catch (error) {
      setAuthMessage(error.message, "error");
    }
  });
}
