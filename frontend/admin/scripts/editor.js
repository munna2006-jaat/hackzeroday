/* GrapesJS room content editor */

const params = new URLSearchParams(window.location.search);
const roomId = params.get("roomId");

let editor = null;
let roomMeta = null;
let isMobileView = false;

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

function questionInnerHtml(prompt, answerType) {
  const input =
    answerType === "mcq"
      ? `<select disabled><option>Select an answer...</option></select>`
      : `<input type="text" disabled placeholder="Student answer..." />`;
  return `
    <div class="hzd-q-label">Question · ${answerType}</div>
    <p class="hzd-q-prompt">${Admin.escapeHtml(prompt || "Your question here")}</p>
    ${input}
    <button type="button" class="hzd-submit-btn" disabled style="margin-top:0.5rem;opacity:0.6">Submit</button>`;
}

function flagInnerHtml(prompt, flag) {
  return `
    <div class="hzd-q-label">Flag Challenge</div>
    <p class="hzd-q-prompt">${Admin.escapeHtml(prompt || "Submit the flag")}</p>
    <input type="text" disabled placeholder="HZD{...}" value="${Admin.escapeHtml(flag ? "" : "")}" />
    <button type="button" class="hzd-submit-btn" disabled style="margin-top:0.5rem;opacity:0.6">Submit Flag</button>`;
}

function registerCustomBlocks(ed) {
  const dc = ed.DomComponents;
  const bm = ed.BlockManager;

  dc.addType("hzd-question", {
    isComponent: (el) => el?.classList?.contains("hzd-question-block"),
    model: {
      defaults: {
        tagName: "div",
        attributes: {
          class: "hzd-question-block",
          "data-prompt": "What is the answer?",
          "data-answer-type": "text",
          "data-correct-answer": "",
          "data-hints": "",
          "data-options": ""
        },
        traits: [
          { type: "text", name: "data-prompt", label: "Question" },
          {
            type: "select",
            name: "data-answer-type",
            label: "Answer Type",
            options: [
              { id: "text", name: "Text" },
              { id: "flag", name: "Flag" },
              { id: "mcq", name: "Multiple Choice" }
            ]
          },
          { type: "text", name: "data-correct-answer", label: "Correct Answer" },
          { type: "textarea", name: "data-options", label: "MCQ Options (one per line)" },
          { type: "textarea", name: "data-hints", label: "Hints (one per line)" }
        ],
        components: questionInnerHtml("What is the answer?", "text")
      },
      init() {
        this.on("change:attributes:data-prompt change:attributes:data-answer-type", this.refreshPreview);
      },
      refreshPreview() {
        const attrs = this.getAttributes();
        this.components(questionInnerHtml(attrs["data-prompt"], attrs["data-answer-type"] || "text"));
      }
    }
  });

  dc.addType("hzd-flag", {
    isComponent: (el) => el?.classList?.contains("hzd-flag-block"),
    model: {
      defaults: {
        tagName: "div",
        attributes: {
          class: "hzd-flag-block",
          "data-prompt": "Find and submit the flag",
          "data-flag": "HZD{example_flag}"
        },
        traits: [
          { type: "text", name: "data-prompt", label: "Instructions" },
          { type: "text", name: "data-flag", label: "Flag (HZD{...})" }
        ],
        components: flagInnerHtml("Find and submit the flag", "HZD{example_flag}")
      },
      init() {
        this.on("change:attributes:data-prompt change:attributes:data-flag", this.refreshPreview);
      },
      refreshPreview() {
        const attrs = this.getAttributes();
        this.components(flagInnerHtml(attrs["data-prompt"], attrs["data-flag"]));
      }
    }
  });

  bm.add("text", {
    label: "Text",
    category: "Basic",
    content: "<p>Write your lesson content here. Keep it beginner-friendly!</p>"
  });

  bm.add("heading", {
    label: "Heading",
    category: "Basic",
    content: "<h2>Section Title</h2>"
  });

  bm.add("image", {
    label: "Image",
    category: "Basic",
    content: { type: "image", attributes: { src: "https://via.placeholder.com/600x300/10251e/36f58f?text=HackZeroDay" } }
  });

  bm.add("code", {
    label: "Code",
    category: "Basic",
    content:
      '<pre style="background:#0a120e;padding:1rem;border-radius:8px;border:1px solid rgba(151,255,194,0.14);font-family:JetBrains Mono,monospace;color:#b7ff5a;"><code>$ whoami\nstudent</code></pre>'
  });

  bm.add("divider", {
    label: "Divider",
    category: "Basic",
    content: '<hr style="border:none;border-top:1px solid rgba(151,255,194,0.2);margin:1.5rem 0;" />'
  });

  bm.add("spacer", {
    label: "Spacer",
    category: "Basic",
    content: '<div style="height:2rem;"></div>'
  });

  bm.add("hzd-question", {
    label: "Question",
    category: "HackZeroDay",
    content: { type: "hzd-question" }
  });

  bm.add("hzd-flag", {
    label: "Flag",
    category: "HackZeroDay",
    content: { type: "hzd-flag" }
  });
}

function initEditor(room) {
  editor = grapesjs.init({
    container: "#gjs",
    height: "100%",
    width: "auto",
    fromElement: false,
    storageManager: false,
    plugins: ["gjs-blocks-basic"],
    pluginsOpts: {
      "gjs-blocks-basic": {}
    },
    canvas: {
      styles: [
        "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono&display=swap"
      ]
    },
    deviceManager: {
      devices: [
        { name: "Desktop", width: "" },
        { name: "Mobile", width: "375px", widthMedia: "480px" }
      ]
    },
    blockManager: {
      appendTo: undefined
    }
  });

  registerCustomBlocks(editor);

  if (room.layoutJson && Object.keys(room.layoutJson).length) {
    editor.loadProjectData(room.layoutJson);
  } else {
    const starter = room.contentHtml || `
      <div style="max-width:720px;margin:0 auto;padding:2rem;font-family:Inter,sans-serif;color:#f3fff8;">
        <h1 style="color:#36f58f;">${Admin.escapeHtml(room.title)}</h1>
        <p style="color:#9eb9ad;line-height:1.6;">${Admin.escapeHtml(room.description || "Start building your room content with blocks from the left panel.")}</p>
      </div>`;
    editor.setComponents(starter);
    if (room.contentCss) {
      editor.setStyle(room.contentCss);
    }
  }
}

async function saveContent(publish = false) {
  if (!editor || !roomId) return;

  const payload = {
    contentHtml: editor.getHtml(),
    contentCss: editor.getCss(),
    layoutJson: editor.getProjectData(),
    publish
  };

  setStatus(publish ? "Publishing..." : "Saving draft...");

  try {
    const data = await Admin.api(`/api/admin/rooms/${roomId}/content`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    setStatus(
      publish
        ? `Published! ${data.questionsSaved} question(s) saved.`
        : `Draft saved. ${data.questionsSaved} question(s) extracted.`
    );
    Admin.showToast(publish ? "Room published." : "Draft saved.");
    roomMeta = data.room;
  } catch (error) {
    setStatus(error.message, true);
    Admin.showToast(error.message, "error");
  }
}

function openPreview() {
  if (!editor || !roomId) return;

  const preview = {
    title: roomMeta?.title || "Room Preview",
    html: editor.getHtml(),
    css: editor.getCss()
  };

  sessionStorage.setItem(`hzd_preview_${roomId}`, JSON.stringify(preview));
  window.open(`preview.html?roomId=${encodeURIComponent(roomId)}`, "_blank");
}

function toggleDevice() {
  if (!editor) return;
  isMobileView = !isMobileView;
  editor.setDevice(isMobileView ? "Mobile" : "Desktop");
  document.getElementById("toggleDeviceBtn").textContent = isMobileView ? "🖥 Desktop" : "📱 Mobile";
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
    document.getElementById("editorRoomTitle").textContent = room.title;
    document.getElementById("editorRoomSlug").textContent = `${room.slug} · ${room.status}`;
    initEditor(room);
  } catch (error) {
    Admin.showToast(error.message, "error");
    setStatus(error.message, true);
    return;
  }

  document.getElementById("saveDraftBtn").addEventListener("click", () => saveContent(false));
  document.getElementById("publishBtn").addEventListener("click", () => saveContent(true));
  document.getElementById("previewBtn").addEventListener("click", openPreview);
  document.getElementById("toggleDeviceBtn").addEventListener("click", toggleDevice);
}

boot();
