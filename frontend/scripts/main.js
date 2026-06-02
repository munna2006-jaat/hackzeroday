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
      setAuthMessage(data.message, "success");
    } catch (error) {
      setAuthMessage(error.message, "error");
    }
  });
}
