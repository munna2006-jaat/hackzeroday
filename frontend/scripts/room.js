/* room.js - Published task-based room viewer */

onHZDReady(async () => {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");

  const titleEl = document.getElementById("roomTitle");
  const descEl = document.getElementById("roomDescription");
  const metaEl = document.getElementById("roomMeta");
  const loadingEl = document.getElementById("roomLoading");
  const errorEl = document.getElementById("roomError");
  const contentEl = document.getElementById("roomContent");

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
    <span class="room-badge">${room.tasksCount || room.tasks?.length || 0} tasks</span>`;

  renderTasks(room, contentEl);
  loadingEl.hidden = true;
  contentEl.hidden = false;
});

function renderTasks(room, contentEl) {
  const tasks = room.tasks || [];
  if (!tasks.length) {
    contentEl.innerHTML = `<p>This room has no tasks yet.</p>`;
    return;
  }

  contentEl.innerHTML = tasks
    .map(
      (task, index) => `
        <section class="room-task" data-task-id="${task.id}">
          <div class="room-task-kicker">Task ${index + 1}</div>
          <h2>${HZD.escapeHtml(task.title)}</h2>
          ${task.imageUrl ? `<img class="room-task-image" src="${HZD.escapeHtml(task.imageUrl)}" alt="" />` : ""}
          <div class="room-task-content">${task.contentHtml || ""}</div>
          <div class="room-task-questions">
            ${(task.questions || []).map((question) => questionMarkup(room, task, question)).join("")}
          </div>
        </section>`
    )
    .join("");

  activateQuestionWidgets(room);
}

function questionMarkup(room, task, question) {
  const isFlag = question.type === "FLAG";
  const solved = localStorage.getItem(storageKey(room, question)) === "solved";
  const input =
    question.type === "MCQ" && question.options?.length
      ? `<select class="hzd-answer-select" ${solved ? "disabled" : ""}>
          <option value="">Select an answer...</option>
          ${question.options.map((opt) => `<option value="${HZD.escapeHtml(opt)}">${HZD.escapeHtml(opt)}</option>`).join("")}
        </select>`
      : `<input type="text" class="hzd-answer-input${isFlag ? " mono" : ""}" placeholder="${isFlag ? "HZD{your_flag}" : "Your answer..."}" ${solved ? "disabled" : ""} />`;

  return `
    <article class="hzd-question-block" data-task-id="${task.id}" data-question-id="${question.id}" data-block-id="${HZD.escapeHtml(question.blockId)}">
      <div class="hzd-q-label">${isFlag ? "Flag Challenge" : question.type === "MCQ" ? "Multiple Choice" : "Question"}</div>
      <p class="hzd-q-prompt">${HZD.escapeHtml(question.prompt)}</p>
      ${input}
      <button type="button" class="hzd-submit-btn" ${solved ? "disabled" : ""}>${isFlag ? "Submit Flag" : "Submit Answer"}</button>
      <div class="hzd-feedback${solved ? " correct" : ""}" ${solved ? "" : "hidden"}>${solved ? "Solved" : ""}</div>
    </article>`;
}

function storageKey(room, question) {
  return `hzd_room_${room.slug}_q_${question.id}`;
}

function activateQuestionWidgets(room) {
  document.querySelectorAll(".hzd-question-block").forEach((block) => {
    const questionId = block.dataset.questionId;
    const blockId = block.dataset.blockId;
    const question = (room.tasks || []).flatMap((task) => task.questions || []).find((q) => q.id === questionId);
    if (!question) return;

    const inputEl = block.querySelector("input, select");
    const btn = block.querySelector(".hzd-submit-btn");
    const feedback = block.querySelector(".hzd-feedback");

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
          body: JSON.stringify({ questionId, blockId, answer })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Submit failed");

        feedback.hidden = false;
        if (data.correct) {
          feedback.className = "hzd-feedback correct";
          feedback.textContent = data.message || "Correct!";
          localStorage.setItem(storageKey(room, question), "solved");
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
    inputEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter") submit();
    });
  });
}
