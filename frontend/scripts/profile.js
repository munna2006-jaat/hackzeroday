/* profile.js - My Profile page */

onHZDReady(() => {

  loadProfile();

  async function loadProfile() {
    try {
      await HZD.fetchMe();
      const user = HZD.currentUser;

      const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
      };

      set("profilePoints", user.points || 0);
      set("profileStreak", user.streak ?? 3);
      set("profileSolved", user.solvedCount || 0);
      set("profileNameText", user.name || "Anonymous Hacker");
      set("profileEmailText", user.email);

      const initial = (user.name || "H").charAt(0).toUpperCase();
      const avatar = document.getElementById("profileAvatarLarge");
      if (avatar) avatar.textContent = initial;

      const inputName = document.getElementById("profileInputName");
      const inputCollege = document.getElementById("profileInputCollege");
      const inputGoal = document.getElementById("profileInputGoal");
      if (inputName) inputName.value = user.name || "";
      if (inputCollege) inputCollege.value = user.college || "";
      if (inputGoal) inputGoal.value = user.learningGoal || "";

      HZD.loadUserRank(document.getElementById("profileRank"));
    } catch (err) {
      console.error("[profile] Load error:", err);
    }
  }

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
            Authorization: `Bearer ${HZD.token}`,
          },
          body: JSON.stringify({ name, college, learningGoal }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Failed to update profile.");

        profileFormMessage.textContent = data.message;
        profileFormMessage.className = "form-message success";
        HZD.currentUser = data.user;
        HZD.updateTopbarStats();
        HZD.setPageGreeting();

        document.getElementById("profileNameText").textContent = data.user.name || "Anonymous Hacker";
        document.getElementById("profileAvatarLarge").textContent = (data.user.name || "H").charAt(0).toUpperCase();

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
});
