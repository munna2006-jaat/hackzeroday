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
  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const mode = document.body.dataset.auth === "signup" ? "Signup" : "Login";
    authMessage.textContent = `${mode} demo ready. Connect the backend API to activate real authentication.`;
  });
}
