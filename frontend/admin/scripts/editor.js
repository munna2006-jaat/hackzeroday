const params = new URLSearchParams(window.location.search);
const roomId = params.get("roomId");

let roomMeta = null;
let tasks = [];
let selectedTaskId = null;

const taskListEl = document.getElementById("taskList");
const taskForm = document.getElementById("taskForm");
const emptyState = document.getElementById("emptyEditorState");
const questionsList = document.getElementById("questionsList");

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function setStatus(message, isError = false) {
  const el = document.getElementById("editorStatus");
  if (!message) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  el.textContent = message;
  el.style.color = isError ? "var(--danger)" : "var(--green)";
  el.style.background = isError ? "rgba(255,107,107,0.08)" : "rgba(54,245,143,0.08)";
}

function selectedTask() {
  return tasks.find((task) => task.localId === selectedTaskId);
}

function blankQuestion(order = 0) {
  return {
    localId: uid("question"),
    blockId: uid("question-block"),
    type: "TEXT",
    prompt: "",
    answer: "",
    options: [],
    hints: [],
    order
  };
}

function normalizeLoadedTask(task, index) {
  return {
    localId: task.id || uid("task"),
    id: task.id,
    title: task.title || `Task ${index + 1}`,
    contentHtml: task.contentHtml || "",
    imageUrl: task.imageUrl || "",
    order: Number.isInteger(Number(task.order)) ? Number(task.order) : index,
    questions: (task.questions || []).map((q, qIndex) => ({
      localId: q.id || uid("question"),
      id: q.id,
      blockId: q.blockId || `question-${qIndex + 1}`,
      type: q.type || "TEXT",
      prompt: q.prompt || "",
      answer: "",
      options: q.options || [],
      hints: q.hints || [],
      order: Number.isInteger(Number(q.order)) ? Number(q.order) : qIndex
    }))
  };
}

function collectFormIntoTask() {
  const task = selectedTask();
  if (!task || taskForm.hidden) return true;

  const title = document.getElementById("taskTitle").value.trim();
  if (!title) {
    Admin.showToast("Task title is required.", "error");
    return false;
  }

  task.title = title;
  task.order = Number(document.getElementById("taskOrder").value) || 0;
  task.imageUrl = document.getElementById("taskImageUrl").value.trim();
  task.contentHtml = document.getElementById("taskContentHtml").value;

  const rows = [...questionsList.querySelectorAll(".question-card")];
  task.questions = rows
    .map((row, index) => {
      const type = row.querySelector("[data-field='type']").value;
      const prompt = row.querySelector("[data-field='prompt']").value.trim();
      const answer = row.querySelector("[data-field='answer']").value.trim();
      const options = row
        .querySelector("[data-field='options']")
        .value.split("\n")
        .map((item) => item.trim())
        .filter(Boolean);
      const hints = row
        .querySelector("[data-field='hints']")
        .value.split("\n")
        .map((item) => item.trim())
        .filter(Boolean);
      if (!prompt && !answer) return null;
      return {
        localId: row.dataset.localId || uid("question"),
        id: row.dataset.questionId || undefined,
        blockId: row.querySelector("[data-field='blockId']").value.trim() || `question-${index + 1}`,
        type,
        prompt,
        answer,
        options,
        hints,
        order: index
      };
    })
    .filter(Boolean);

  return true;
}

function renderTaskList() {
  document.getElementById("taskCount").textContent = tasks.length;
  if (!tasks.length) {
    taskListEl.innerHTML = `<div class="task-list-empty">No tasks yet.</div>`;
    return;
  }

  taskListEl.innerHTML = tasks
    .sort((a, b) => a.order - b.order)
    .map(
      (task, index) => `
        <button type="button" class="task-list-item${task.localId === selectedTaskId ? " active" : ""}" data-task-id="${task.localId}">
          <span>${index + 1}</span>
          <strong>${Admin.escapeHtml(task.title || "Untitled task")}</strong>
          <small>${task.questions.length} question(s)</small>
        </button>`
    )
    .join("");

  taskListEl.querySelectorAll("[data-task-id]").forEach((btn) => {
    btn.addEventListener("click", () => selectTask(btn.dataset.taskId));
  });
}

function renderQuestions(task) {
  questionsList.innerHTML = task.questions
    .map(
      (q, index) => `
        <article class="question-card" data-local-id="${q.localId}" data-question-id="${q.id || ""}">
          <div class="question-card-head">
            <strong>Question ${index + 1}</strong>
            <button type="button" class="btn btn-danger btn-sm" data-remove-question="${q.localId}">Remove</button>
          </div>
          <div class="task-form-grid">
            <div class="form-row">
              <label>Type</label>
              <select data-field="type">
                <option value="TEXT"${q.type === "TEXT" ? " selected" : ""}>Text</option>
                <option value="FLAG"${q.type === "FLAG" ? " selected" : ""}>Flag</option>
                <option value="MCQ"${q.type === "MCQ" ? " selected" : ""}>MCQ</option>
              </select>
            </div>
            <div class="form-row">
              <label>Block ID</label>
              <input data-field="blockId" value="${Admin.escapeHtml(q.blockId || "")}" />
            </div>
          </div>
          <div class="form-row">
            <label>Prompt</label>
            <input data-field="prompt" value="${Admin.escapeHtml(q.prompt || "")}" placeholder="What should the student answer?" />
          </div>
          <div class="form-row">
            <label>Answer</label>
            <input data-field="answer" value="" placeholder="${q.id ? "Leave blank only if you will remove this question before saving" : "Correct answer"}" />
          </div>
          <div class="task-form-grid">
            <div class="form-row">
              <label>MCQ options</label>
              <textarea data-field="options" rows="4" placeholder="One option per line">${Admin.escapeHtml((q.options || []).join("\n"))}</textarea>
            </div>
            <div class="form-row">
              <label>Hints</label>
              <textarea data-field="hints" rows="4" placeholder="One hint per line">${Admin.escapeHtml((q.hints || []).join("\n"))}</textarea>
            </div>
          </div>
        </article>`
    )
    .join("");

  questionsList.querySelectorAll("[data-remove-question]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const current = selectedTask();
      if (!current) return;
      current.questions = current.questions.filter((q) => q.localId !== btn.dataset.removeQuestion);
      renderQuestions(current);
      renderTaskList();
    });
  });
}

function renderTaskForm() {
  const task = selectedTask();
  const hasTask = Boolean(task);
  taskForm.hidden = !hasTask;
  emptyState.hidden = hasTask;
  if (!task) return;

  document.getElementById("taskId").value = task.id || "";
  document.getElementById("taskTitle").value = task.title;
  document.getElementById("taskOrder").value = task.order;
  document.getElementById("taskImageUrl").value = task.imageUrl || "";
  document.getElementById("taskContentHtml").value = task.contentHtml || "";
  renderQuestions(task);
}

function selectTask(localId) {
  if (!collectFormIntoTask()) return;
  selectedTaskId = localId;
  renderTaskList();
  renderTaskForm();
}

function addTask() {
  if (!collectFormIntoTask()) return;
  const order = tasks.length;
  const task = {
    localId: uid("task"),
    title: `Task ${order + 1}`,
    contentHtml: "<p>Write the lesson content here.</p>",
    imageUrl: "",
    order,
    questions: []
  };
  tasks.push(task);
  selectedTaskId = task.localId;
  renderTaskList();
  renderTaskForm();
}

async function saveContent(publish = false) {
  if (!roomId || !collectFormIntoTask()) return;

  const payload = {
    publish,
    tasks: tasks
      .sort((a, b) => a.order - b.order)
      .map((task, index) => ({
        title: task.title,
        id: task.id,
        contentHtml: task.contentHtml || "",
        imageUrl: task.imageUrl || null,
        order: Number.isInteger(Number(task.order)) ? Number(task.order) : index,
        questions: task.questions
      }))
  };

  setStatus(publish ? "Publishing..." : "Saving draft...");
  try {
    const data = await Admin.api(`/api/admin/rooms/${roomId}/content`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    roomMeta = data.room;
    tasks = (data.room.tasks || []).map(normalizeLoadedTask);
    selectedTaskId = tasks[0]?.localId || null;
    renderTaskList();
    renderTaskForm();
    setStatus(`${publish ? "Published" : "Draft saved"}. ${data.questionsSaved} question(s) saved.`);
    Admin.showToast(publish ? "Room published." : "Draft saved.");
  } catch (error) {
    setStatus(error.message, true);
    Admin.showToast(error.message, "error");
  }
}

async function boot() {
  if (!roomId) {
    document.body.innerHTML = `<div style="padding:2rem;color:#f3fff8;"><p>Missing roomId in URL.</p><a href="rooms.html">Back to rooms</a></div>`;
    return;
  }

  const banner = document.getElementById("devKeyBanner");
  if (banner) {
    banner.innerHTML = `Dev mode: using <code>x-admin-dev-key</code>. <button type="button" class="btn btn-ghost btn-sm" id="changeDevKeyBtn">Change key</button>`;
    document.getElementById("changeDevKeyBtn")?.addEventListener("click", () => {
      const next = prompt("Enter admin dev key:", Admin.getDevKey());
      if (next) {
        Admin.setDevKey(next.trim());
        Admin.showToast("Dev key updated.");
      }
    });
  }

  try {
    const { room } = await Admin.api(`/api/admin/rooms/${roomId}/content`);
    roomMeta = room;
    tasks = (room.tasks || []).map(normalizeLoadedTask);
    selectedTaskId = tasks[0]?.localId || null;
    document.getElementById("editorRoomTitle").textContent = room.title;
    document.getElementById("editorRoomSlug").textContent = `${room.slug} - ${room.status}`;
    renderTaskList();
    renderTaskForm();
  } catch (error) {
    Admin.showToast(error.message, "error");
    setStatus(error.message, true);
    return;
  }

  document.getElementById("addTaskBtn").addEventListener("click", addTask);
  document.getElementById("emptyAddTaskBtn").addEventListener("click", addTask);
  document.getElementById("saveDraftBtn").addEventListener("click", () => saveContent(false));
  document.getElementById("publishBtn").addEventListener("click", () => saveContent(true));
  document.getElementById("addQuestionBtn").addEventListener("click", () => {
    const task = selectedTask();
    if (!task) return;
    task.questions.push(blankQuestion(task.questions.length));
    renderQuestions(task);
    renderTaskList();
  });
  document.getElementById("deleteTaskBtn").addEventListener("click", () => {
    const task = selectedTask();
    if (!task || !Admin.confirmDelete(task.title)) return;
    tasks = tasks.filter((item) => item.localId !== task.localId);
    selectedTaskId = tasks[0]?.localId || null;
    renderTaskList();
    renderTaskForm();
  });
  taskForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (collectFormIntoTask()) {
      renderTaskList();
      Admin.showToast("Task changes applied locally. Save draft or publish to persist.");
    }
  });
}

boot();
