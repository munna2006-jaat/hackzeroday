Admin.initShell("modules");

let modules = [];
let paths = [];
let editingModuleId = null;

const moduleForm = document.getElementById("moduleForm");
const modulesTableBody = document.getElementById("modulesTableBody");
const pathAssignSelect = document.getElementById("modulePathAssign");

function resetModuleForm() {
  editingModuleId = null;
  moduleForm.reset();
  document.getElementById("moduleId").value = "";
  document.getElementById("moduleFormTitle").textContent = "Create Module";
  document.getElementById("moduleSubmitBtn").textContent = "Create Module";
  document.getElementById("moduleCancelBtn").hidden = true;
}

function moduleFormData() {
  return {
    title: document.getElementById("moduleTitle").value.trim(),
    slug: document.getElementById("moduleSlug").value.trim() || undefined,
    description: document.getElementById("moduleDescription").value.trim(),
    coverImage: document.getElementById("moduleCoverImage").value.trim() || null,
    order: Number(document.getElementById("moduleOrder").value) || 0
  };
}

function populatePathSelect() {
  pathAssignSelect.innerHTML =
    `<option value="">— None —</option>` +
    paths.map((p) => `<option value="${p.id}">${Admin.escapeHtml(p.title)}</option>`).join("");
}

function renderModulesTable() {
  if (!modules.length) {
    modulesTableBody.innerHTML = `<tr><td colspan="4" class="empty-state">No modules yet.</td></tr>`;
    return;
  }

  modulesTableBody.innerHTML = modules
    .map((mod) => {
      const pathTags = (mod.pathModules || [])
        .map((pm) => `<span class="module-tag">${Admin.escapeHtml(pm.path.title)}</span>`)
        .join("");
      return `<tr>
        <td>
          <strong>${Admin.escapeHtml(mod.title)}</strong><br>
          <small style="color:var(--muted)">${Admin.escapeHtml(mod.slug)}</small>
        </td>
        <td><div class="module-tags">${pathTags || "—"}</div></td>
        <td>${mod._count?.rooms ?? 0}</td>
        <td>
          <div class="table-actions">
            <button type="button" class="btn btn-ghost btn-sm" data-edit-module="${mod.id}">Edit</button>
            <button type="button" class="btn btn-danger btn-sm" data-delete-module="${mod.id}">Delete</button>
          </div>
        </td>
      </tr>`;
    })
    .join("");

  modulesTableBody.querySelectorAll("[data-edit-module]").forEach((btn) => {
    btn.addEventListener("click", () => startEditModule(btn.dataset.editModule));
  });

  modulesTableBody.querySelectorAll("[data-delete-module]").forEach((btn) => {
    btn.addEventListener("click", () => deleteModule(btn.dataset.deleteModule));
  });
}

function startEditModule(id) {
  const mod = modules.find((m) => m.id === id);
  if (!mod) return;

  editingModuleId = id;
  document.getElementById("moduleId").value = id;
  document.getElementById("moduleTitle").value = mod.title;
  document.getElementById("moduleSlug").value = mod.slug;
  document.getElementById("moduleDescription").value = mod.description || "";
  document.getElementById("moduleCoverImage").value = mod.coverImage || "";
  document.getElementById("moduleOrder").value = mod.order;
  document.getElementById("moduleFormTitle").textContent = "Edit Module";
  document.getElementById("moduleSubmitBtn").textContent = "Save Changes";
  document.getElementById("moduleCancelBtn").hidden = false;
}

async function loadData() {
  const [modulesRes, pathsRes] = await Promise.all([
    Admin.api("/api/admin/modules"),
    Admin.api("/api/admin/paths")
  ]);
  modules = modulesRes.modules;
  paths = pathsRes.paths;
  populatePathSelect();
  renderModulesTable();
}

async function deleteModule(id) {
  const mod = modules.find((m) => m.id === id);
  if (!mod || !Admin.confirmDelete(mod.title)) return;

  try {
    await Admin.api(`/api/admin/modules/${id}`, { method: "DELETE" });
    Admin.showToast("Module deleted.");
    if (editingModuleId === id) resetModuleForm();
    await loadData();
  } catch (error) {
    Admin.showToast(error.message, "error");
  }
}

moduleForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = moduleFormData();
  const pathId = pathAssignSelect.value;

  try {
    let moduleId = editingModuleId;

    if (editingModuleId) {
      const res = await Admin.api(`/api/admin/modules/${editingModuleId}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      moduleId = res.module.id;
      Admin.showToast("Module updated.");
    } else {
      const res = await Admin.api("/api/admin/modules", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      moduleId = res.module.id;
      Admin.showToast("Module created.");
    }

    if (pathId && moduleId) {
      await Admin.api(`/api/admin/paths/${pathId}/modules`, {
        method: "POST",
        body: JSON.stringify({ moduleId, order: payload.order })
      });
      Admin.showToast("Module assigned to path.");
    }

    resetModuleForm();
    await loadData();
  } catch (error) {
    Admin.showToast(error.message, "error");
  }
});

document.getElementById("moduleCancelBtn").addEventListener("click", resetModuleForm);

loadData().catch((error) => Admin.showToast(error.message, "error"));
