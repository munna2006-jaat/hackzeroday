/* settings.js - Settings page */

onHZDReady(() => {

  const themeBtns = document.querySelectorAll(".theme-btn");
  const savedTheme = HZD.loadTheme();

  themeBtns.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.theme === savedTheme);
    btn.addEventListener("click", () => {
      themeBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      HZD.setTheme(btn.dataset.theme);
    });
  });

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
            Authorization: `Bearer ${HZD.token}`,
          },
          body: JSON.stringify({ oldPassword, newPassword }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Failed to update password.");

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

  const btnDeleteAccount = document.getElementById("btnDeleteAccount");
  if (btnDeleteAccount) {
    btnDeleteAccount.addEventListener("click", async () => {
      if (!confirm("WARNING: Are you absolutely sure you want to delete your account permanently? All stats will be lost.")) return;
      try {
        const response = await fetch("/api/users/delete-account", {
          method: "DELETE",
          headers: { Authorization: `Bearer ${HZD.token}` },
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
    });
  }
});
