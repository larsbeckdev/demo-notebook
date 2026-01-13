document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "noteblock_notes";
  const TRASH_KEY = "noteblock_trash";

  const titleEl = document.getElementById("title");
  const textEl = document.getElementById("text");
  const saveBtn = document.getElementById("saveBtn");
  const notesEl = document.getElementById("notes");
  const trashEl = document.getElementById("trashNotes");

  async function loadFrom(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  async function saveTo(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  async function loadNotes() {
    return loadFrom(STORAGE_KEY);
  }
  async function saveNotes(notes) {
    return saveTo(STORAGE_KEY, notes);
  }

  async function loadTrash() {
    return loadFrom(TRASH_KEY);
  }
  async function saveTrash(trash) {
    return saveTo(TRASH_KEY, trash);
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // --- Render Notes ---
  async function renderNotes() {
    const notes = await loadNotes();
    if (!notesEl) return;

    if (notes.length === 0) {
      notesEl.innerHTML = `<p style="opacity:.7">Noch keine Notizen gespeichert.</p>`;
      return;
    }

    notesEl.innerHTML = notes
      .map(
        (n) => `
          <div class="note-card" data-id="${n.id}">
            <div class="note-card__head">
              <h3 class="note-card__title">${escapeHtml(
                n.title || "Ohne Titel"
              )}</h3>
              <button class="note-delete" data-action="trash" data-id="${
                n.id
              }" aria-label="Notiz in Papierkorb">✕</button>
            </div>
            <p class="note-card__text">${escapeHtml(n.text).replaceAll(
              "\n",
              "<br>"
            )}</p>
            <small class="note-card__meta">${new Date(
              n.createdAt
            ).toLocaleString()}</small>
          </div>
        `
      )
      .join("");
  }

  async function renderTrash() {
    const trash = await loadTrash();
    if (!trashEl) return;

    if (trash.length === 0) {
      trashEl.innerHTML = `<p style="opacity:.7">Papierkorb ist leer.</p>`;
      return;
    }

    trashEl.innerHTML = `
      <div style="display:flex; gap:.5rem; margin-bottom:.75rem;">
        <button data-action="empty-trash" type="button">Papierkorb leeren</button>
      </div>
      ${trash
        .map(
          (n) => `
            <div class="note-card" data-id="${n.id}">
              <div class="note-card__head">
                <h3 class="note-card__title">${escapeHtml(
                  n.title || "Ohne Titel"
                )}</h3>
                <div style="display:flex; gap:.5rem;">
                  <button data-action="restore" data-id="${
                    n.id
                  }" type="button">Wiederherstellen</button>
                  <button data-action="delete-forever" data-id="${
                    n.id
                  }" type="button" aria-label="Endgültig löschen">Löschen</button>
                </div>
              </div>
              <p class="note-card__text">${escapeHtml(n.text).replaceAll(
                "\n",
                "<br>"
              )}</p>
              <small class="note-card__meta">
                Erstellt: ${new Date(n.createdAt).toLocaleString()}
                · Gelöscht: ${new Date(n.deletedAt).toLocaleString()}
              </small>
            </div>
          `
        )
        .join("")}
    `;
  }

  async function addNote() {
    const title = titleEl?.value.trim() ?? "";
    const text = textEl?.value.trim() ?? "";

    if (!text) {
      alert("Bitte eine Notiz eingeben.");
      return;
    }

    const notes = await loadNotes();

    notes.unshift({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      title,
      text,
      createdAt: Date.now(),
    });

    await saveNotes(notes);

    if (titleEl) titleEl.value = "";
    if (textEl) textEl.value = "";

    await renderNotes();
  }

  async function moveToTrash(id) {
    const notes = await loadNotes();
    const note = notes.find((n) => n.id === id);
    if (!note) return;

    const filtered = notes.filter((n) => n.id !== id);
    await saveNotes(filtered);

    const trash = await loadTrash();
    trash.unshift({
      ...note,
      deletedAt: Date.now(),
    });
    await saveTrash(trash);

    await renderNotes();
    await renderTrash();
  }

  async function restoreFromTrash(id) {
    const trash = await loadTrash();
    const note = trash.find((n) => n.id === id);
    if (!note) return;

    const remainingTrash = trash.filter((n) => n.id !== id);
    await saveTrash(remainingTrash);

    const notes = await loadNotes();
    const { deletedAt, ...restored } = note;
    notes.unshift(restored);
    await saveNotes(notes);

    await renderNotes();
    await renderTrash();
  }

  async function deleteForever(id) {
    const trash = await loadTrash();
    const remainingTrash = trash.filter((n) => n.id !== id);
    await saveTrash(remainingTrash);
    await renderTrash();
  }

  async function emptyTrash() {
    await saveTrash([]);
    await renderTrash();
  }

  // --- Events ---
  if (saveBtn) {
    saveBtn.addEventListener("click", () => addNote().catch(console.error));
  }

  // Enter zum Speichern (nur im Title-Feld)
  if (titleEl) {
    titleEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") addNote().catch(console.error);
    });
  }

  // Notes: in Trash schieben
  if (notesEl) {
    notesEl.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action='trash']");
      if (!btn) return;
      moveToTrash(btn.dataset.id).catch(console.error);
    });
  }

  // Trash: restore / delete forever / empty
  if (trashEl) {
    trashEl.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;

      const action = btn.dataset.action;
      const id = btn.dataset.id;

      if (action === "restore") restoreFromTrash(id).catch(console.error);
      if (action === "delete-forever") deleteForever(id).catch(console.error);
      if (action === "empty-trash") emptyTrash().catch(console.error);
    });
  }

  // Initial render
  renderNotes().catch(console.error);
  renderTrash().catch(console.error);
});
