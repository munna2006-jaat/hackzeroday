Admin.initShell("rooms");

let rooms = [];
let modules = [];
let editingRoomId = null;

const roomForm = document.getElementById("roomForm");
const roomsTableBody = document.getElementById("roomsTableBody");
const moduleSelect = document.getElementById("roomModule");

function resetRoomForm() {
  editingRoomId = null;
  roomForm.reset();
  document.getElementById("roomId").value = "";
  document.getElementById("roomFormTitle").textContent = "Create Room";
  document.getElementById("roomSubmitBtn").textContent = "Create Room";
  document.getElementById("roomCancelBtn").hidden = true;
}

function populateModuleSelect() {
  moduleSelect.innerHTML =
    `<option value="">Select module...</option>` +
    modules.map((m) => `<option value="${m.id}">${Admin.escapeHtml(m.title)}</option>`).join("");
}

function roomFormData() {
  return {
    title: document.getElementById("roomTitle").value.trim(),
    slug: document.getElementById("roomSlug").value.trim() || undefined,
    moduleId: document.getElementById("roomModule").value,
    description: document.getElementById("roomDescription").value.trim(),
    difficulty: document.getElementById("roomDifficulty").value,
    status: document.getElementById("roomStatus").value,
    duration: document.getElementById("roomDuration").value.trim() || "1h",
    tasksCount: Number(document.getElementById("roomTasks").value) || 0,
    order: Number(document.getElementById("roomOrder").value) || 0
  };
}

function renderRoomsTable() {
  if (!rooms.length) {
    roomsTableBody.innerHTML = `<tr><td colspan="4" class="empty-state">No rooms yet.</td></tr>`;
    return;
  }

  roomsTableBody.innerHTML = rooms
    .map((room) => {
      return `<tr>
        <td>
          <strong>${Admin.escapeHtml(room.title)}</strong><br>
          <small style="color:var(--muted)">${Admin.escapeHtml(room.slug)} · ${Admin.badgeDifficulty(room.difficulty)} · ${Admin.escapeHtml(room.duration)} · ${room.tasksCount} tasks</small>
        </td>
        <td>${Admin.escapeHtml(room.module?.title || "—")}</td>
        <td>${Admin.badgeStatus(room.status)}</td>
        <td>
          <div class="table-actions">
            <button type="button" class="btn btn-ghost btn-sm" data-content-placeholder="${room.id}">Edit Content</button>
            <button type="button" class="btn btn-ghost btn-sm" data-edit-room="${room.id}">Edit</button>
            <button type="button" class="btn btn-danger btn-sm" data-delete-room="${room.id}">Delete</button>
          </div>
        </td>
      </tr>`;
    })
    .join("");

  roomsTableBody.querySelectorAll("[data-edit-room]").forEach((btn) => {
    btn.addEventListener("click", () => startEditRoom(btn.dataset.editRoom));
  });

  roomsTableBody.querySelectorAll("[data-delete-room]").forEach((btn) => {
    btn.addEventListener("click", () => deleteRoom(btn.dataset.deleteRoom));
  });

  roomsTableBody.querySelectorAll("[data-content-placeholder]").forEach((btn) => {
    btn.addEventListener("click", () => {
      Admin.showToast("Content editor coming in Phase 2 (GrapesJS).");
    });
  });
}

function startEditRoom(id) {
  const room = rooms.find((r) => r.id === id);
  if (!room) return;

  editingRoomId = id;
  document.getElementById("roomId").value = id;
  document.getElementById("roomTitle").value = room.title;
  document.getElementById("roomSlug").value = room.slug;
  document.getElementById("roomModule").value = room.moduleId;
  document.getElementById("roomDescription").value = room.description || "";
  document.getElementById("roomDifficulty").value = room.difficulty;
  document.getElementById("roomStatus").value = room.status;
  document.getElementById("roomDuration").value = room.duration;
  document.getElementById("roomTasks").value = room.tasksCount;
  document.getElementById("roomOrder").value = room.order;
  document.getElementById("roomFormTitle").textContent = "Edit Room";
  document.getElementById("roomSubmitBtn").textContent = "Save Changes";
  document.getElementById("roomCancelBtn").hidden = false;
}

async function loadData() {
  const [roomsRes, modulesRes] = await Promise.all([
    Admin.api("/api/admin/rooms"),
    Admin.api("/api/admin/modules")
  ]);
  rooms = roomsRes.rooms;
  modules = modulesRes.modules;
  populateModuleSelect();
  renderRoomsTable();
}

async function deleteRoom(id) {
  const room = rooms.find((r) => r.id === id);
  if (!room || !Admin.confirmDelete(room.title)) return;

  try {
    await Admin.api(`/api/admin/rooms/${id}`, { method: "DELETE" });
    Admin.showToast("Room deleted.");
    if (editingRoomId === id) resetRoomForm();
    await loadData();
  } catch (error) {
    Admin.showToast(error.message, "error");
  }
}

roomForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = roomFormData();

  if (!payload.moduleId) {
    Admin.showToast("Select a parent module.", "error");
    return;
  }

  try {
    if (editingRoomId) {
      await Admin.api(`/api/admin/rooms/${editingRoomId}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      Admin.showToast("Room updated.");
    } else {
      await Admin.api("/api/admin/rooms", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      Admin.showToast("Room created.");
    }
    resetRoomForm();
    await loadData();
  } catch (error) {
    Admin.showToast(error.message, "error");
  }
});

document.getElementById("roomCancelBtn").addEventListener("click", resetRoomForm);

loadData().catch((error) => Admin.showToast(error.message, "error"));
