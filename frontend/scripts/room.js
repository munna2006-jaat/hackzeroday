/* room.js - Published room viewer with interactive questions */

onHZDReady(async () => {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");

  const titleEl = document.getElementById("roomTitle");
  const descEl = document.getElementById("roomDescription");
  const metaEl = document.getElementById("roomMeta");
  const loadingEl = document.getElementById("roomLoading");
  const errorEl = document.getElementById("roomError");
  const contentEl = document.getElementById("roomContent");
  const cssEl = document.getElementById("roomCustomCss");

  if (!slug) {
    loadingEl.hidden = true;
    errorEl.hidden = false;
    errorEl.textContent = "No room specified. Open a room from the Rooms page.";
    return;
  }

  let room = null;

  try {
    const response = await fetch(`/api/content/rooms/${encodeURIComponent(slug)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Room not found");
    room = data.room;
  } catch (error) {
    loadingEl.hidden = true;
    errorEl.hidden = false;
    errorEl.textContent = error.message;
    return;
  }

  document.title = `${room.title} | HackZeroDay Labs`;
  titleEl.textContent = room.title;
  descEl.textContent = room.description || "";
  metaEl.innerHTML = `
    <span class="room-badge">${HZD.escapeHtml(room.difficulty)}</span>
    <span class="room-badge">${HZD.escapeHtml(room.duration)}</span>
    <span class="room-badge">${room.tasksCount || 0} tasks</span>`;

  cssEl.textContent = room.contentCss || "";
  contentEl.innerHTML = room.contentHtml || "<p>This room has no content yet.</p>";

  loadingEl.hidden = true;
  contentEl.hidden = false;

  activateQuestionWidgets(room);
});

function findQuestion(room, blockEl) {
  const blockId = blockEl.id || blockEl.getAttribute("id");
  if (blockId) {
    const byBlock = room.questions.find((q) => q.blockId === blockId);
    if (byBlock) return byBlock;
  }
  const promptEl = blockEl.querySelector(".hzd-q-prompt");
  const promptText = promptEl?.textContent?.trim();
  if (promptText) {
    return room.questions.find((q) => q.prompt === promptText);
  }
  return null;
}

function activateQuestionWidgets(room) {
  const blocks = document.querySelectorAll(".hzd-question-block, .hzd-flag-block");

  blocks.forEach((block, index) => {
    const question = findQuestion(room, block);
    if (!question) return;

    const isFlag = block.classList.contains("hzd-flag-block") || question.type === "FLAG";
    const promptEl = block.querySelector(".hzd-q-prompt");
    if (promptEl) promptEl.textContent = question.prompt;

    let inputEl = block.querySelector("input, select");
    const oldBtn = block.querySelector(".hzd-submit-btn");
    if (oldBtn) oldBtn.remove();
    if (inputEl) inputEl.remove();

    if (question.type === "MCQ" && question.options?.length) {
      inputEl = document.createElement("select");
      inputEl.className = "hzd-answer-select";
      inputEl.innerHTML =
        `<option value="">Select an answer...</option>` +
        question.options.map((opt) => `<option value="${HZD.escapeHtml(opt)}">${HZD.escapeHtml(opt)}</option>`).join("");
    } else {
      inputEl = document.createElement("input");
      inputEl.type = "text";
      inputEl.className = `hzd-answer-input${isFlag ? " mono" : ""}`;
      inputEl.placeholder = isFlag ? "HZD{your_flag}" : "Your answer...";
    }

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "hzd-submit-btn";
    btn.textContent = isFlag ? "Submit Flag" : "Submit Answer";

    const feedback = document.createElement("div");
    feedback.className = "hzd-feedback";
    feedback.hidden = true;

    block.appendChild(inputEl);
    block.appendChild(btn);
    block.appendChild(feedback);

    if (!block.id && question.blockId) {
      block.id = question.blockId;
    }

    const storageKey = `hzd_room_${room.slug}_q_${question.id}`;

    if (localStorage.getItem(storageKey) === "solved") {
      inputEl.disabled = true;
      btn.disabled = true;
      feedback.hidden = false;
      feedback.className = "hzd-feedback correct";
      feedback.textContent = "✓ Solved";
      return;
    }

    async function submit() {
      const answer = inputEl.value.trim();
      if (!answer) {
        HZD.showToast("Enter an answer first.", "error");
        return;
      }

      btn.disabled = true;
      try {
        const response = await fetch(`/api/content/rooms/${encodeURIComponent(room.slug)}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId: question.id, blockId: question.blockId, answer })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Submit failed");

        feedback.hidden = false;
        if (data.correct) {
          feedback.className = "hzd-feedback correct";
          feedback.textContent = data.message || "Correct!";
          localStorage.setItem(storageKey, "solved");
          inputEl.disabled = true;
          HZD.showToast("Correct answer!", "success");
        } else {
          feedback.className = "hzd-feedback wrong";
          feedback.textContent = data.message || "Try again.";
          btn.disabled = false;
        }
      } catch (error) {
        HZD.showToast(error.message, "error");
        btn.disabled = false;
      }
    }

    btn.addEventListener("click", submit);
    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
    });
  });
}
