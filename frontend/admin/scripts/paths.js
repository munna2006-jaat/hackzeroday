Admin.initShell("paths");

let paths = [];
let allModules = [];
let editingPathId = null;

const pathForm = document.getElementById("pathForm");
const pathsTableBody = document.getElementById("pathsTableBody");

function resetPathForm() {
  editingPathId = null;
  pathForm.reset();
  document.getElementById("pathId").value = "";
  document.getElementById("pathFormTitle").textContent = "Create Path";
  document.getElementById("pathSubmitBtn").textContent = "Create Path";
  document.getElementById("pathCancelBtn").hidden = true;
}

function pathFormData() {
  return {
    title: document.getElementById("pathTitle").value.trim(),
    slug: document.getElementById("pathSlug").value.trim() || undefined,
    description: document.getElementById("pathDescription").value.trim(),
    difficulty: document.getElementById("pathDifficulty").value,
    status: document.getElementById("pathStatus").value,
    hours: Number(document.getElementById("pathHours").value) || 0,
    order: Number(document.getElementById("pathOrder").value) || 0,
    coverImage: document.getElementById("pathCover").value.trim() || null
  };
}

function renderPathsTable() {
  if (!paths.length) {
    pathsTableBody.innerHTML = `<tr><td colspan="4" class="empty-state">No paths yet. Create your first learning path.</td></tr>`;
    return;
  }

  pathsTableBody.innerHTML = paths
    .map((path) => {
      const modules = (path.pathModules || [])
        .map((pm) => {
          const mod = pm.module;
          return `<span class="module-tag">${Admin.escapeHtml(mod.title)} <small>#${pm.order}</small>
            <button type="button" class="btn btn-ghost btn-sm" data-unassign-path="${path.id}" data-unassign-module="${mod.id}" title="Remove">×</button></span>`;
        })
        .join("");

      const moduleOptions = allModules
        .map((m) => `<option value="${m.id}">${Admin.escapeHtml(m.title)}</option>`)
        .join("");

      return `<tr>
        <td>
          <strong>${Admin.escapeHtml(path.title)}</strong><br>
          <small style="color:var(--muted)">${Admin.escapeHtml(path.slug)} · ${Admin.badgeDifficulty(path.difficulty)} · ${path.hours}h</small>
        </td>
        <td>${Admin.badgeStatus(path.status)}</td>
        <td>
          <div class="module-tags">${modules || '<span class="empty-state" style="padding:0">No modules</span>'}</div>
          <div class="assign-box">
            <h4>Assign module</h4>
            <div class="assign-row">
              <select data-assign-path="${path.id}" class="assign-module-select">${moduleOptions}</select>
              <input type="number" min="0" value="0" data-assign-order="${path.id}" style="max-width:80px" title="Order" />
              <button type="button" class="btn btn-secondary btn-sm" data-assign-btn="${path.id}">Add</button>
            </div>
          </div>
        </td>
        <td>
          <div class="table-actions">
            <button type="button" class="btn btn-ghost btn-sm" data-edit-path="${path.id}">Edit</button>
            <button type="button" class="btn btn-danger btn-sm" data-delete-path="${path.id}">Delete</button>
          </div>
        </td>
      </tr>`;
    })
    .join("");

  pathsTableBody.querySelectorAll("[data-edit-path]").forEach((btn) => {
    btn.addEventListener("click", () => startEditPath(btn.dataset.editPath));
  });

  pathsTableBody.querySelectorAll("[data-delete-path]").forEach((btn) => {
    btn.addEventListener("click", () => deletePath(btn.dataset.deletePath));
  });

  pathsTableBody.querySelectorAll("[data-assign-btn]").forEach((btn) => {
    btn.addEventListener("click", () => assignModule(btn.dataset.assignBtn));
  });

  pathsTableBody.querySelectorAll("[data-unassign-path]").forEach((btn) => {
    btn.addEventListener("click", () => unassignModule(btn.dataset.unassignPath, btn.dataset.unassignModule));
  });
}

function startEditPath(id) {
  const path = paths.find((p) => p.id === id);
  if (!path) return;

  editingPathId = id;
  document.getElementById("pathId").value = id;
  document.getElementById("pathTitle").value = path.title;
  document.getElementById("pathSlug").value = path.slug;
  document.getElementById("pathDescription").value = path.description || "";
  document.getElementById("pathDifficulty").value = path.difficulty;
  document.getElementById("pathStatus").value = path.status;
  document.getElementById("pathHours").value = path.hours;
  document.getElementById("pathOrder").value = path.order;
  document.getElementById("pathCover").value = path.coverImage || "";
  document.getElementById("pathFormTitle").textContent = "Edit Path";
  document.getElementById("pathSubmitBtn").textContent = "Save Changes";
  document.getElementById("pathCancelBtn").hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function loadData() {
  const [pathsRes, modulesRes] = await Promise.all([
    Admin.api("/api/admin/paths"),
    Admin.api("/api/admin/modules")
  ]);
  paths = pathsRes.paths;
  allModules = modulesRes.modules;
  renderPathsTable();
}

async function assignModule(pathId) {
  const select = pathsTableBody.querySelector(`select[data-assign-path="${pathId}"]`);
  const orderInput = pathsTableBody.querySelector(`input[data-assign-order="${pathId}"]`);
  const moduleId = select?.value;
  if (!moduleId) {
    Admin.showToast("Select a module to assign.", "error");
    return;
  }

  try {
    await Admin.api(`/api/admin/paths/${pathId}/modules`, {
      method: "POST",
      body: JSON.stringify({ moduleId, order: Number(orderInput?.value) || 0 })
    });
    Admin.showToast("Module assigned to path.");
    await loadData();
  } catch (error) {
    Admin.showToast(error.message, "error");
  }
}

async function unassignModule(pathId, moduleId) {
  try {
    await Admin.api(`/api/admin/paths/${pathId}/modules/${moduleId}`, { method: "DELETE" });
    Admin.showToast("Module removed from path.");
    await loadData();
  } catch (error) {
    Admin.showToast(error.message, "error");
  }
}

async function deletePath(id) {
  const path = paths.find((p) => p.id === id);
  if (!path || !Admin.confirmDelete(path.title)) return;

  try {
    await Admin.api(`/api/admin/paths/${id}`, { method: "DELETE" });
    Admin.showToast("Path deleted.");
    if (editingPathId === id) resetPathForm();
    await loadData();
  } catch (error) {
    Admin.showToast(error.message, "error");
  }
}

pathForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = pathFormData();

  try {
    if (editingPathId) {
      await Admin.api(`/api/admin/paths/${editingPathId}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      Admin.showToast("Path updated.");
    } else {
      await Admin.api("/api/admin/paths", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      Admin.showToast("Path created.");
    }
    resetPathForm();
    await loadData();
  } catch (error) {
    Admin.showToast(error.message, "error");
  }
});

document.getElementById("pathCancelBtn").addEventListener("click", resetPathForm);

loadData().catch((error) => Admin.showToast(error.message, "error"));
