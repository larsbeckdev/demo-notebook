document.addEventListener("DOMContentLoaded", function () {
  // 1) Schlüssel für localStorage
  const NOTES_KEY = "noteblock_notes";
  const TRASH_KEY = "noteblock_trash";

  // 2) Elemente aus HTML holen
  const titleEl = document.getElementById("title");
  const textEl = document.getElementById("text");
  const saveBtn = document.getElementById("saveBtn");
  const notesEl = document.getElementById("notes");
  const trashEl = document.getElementById("trashNotes");

  // ----------------------------
  // HELFER: Laden & Speichern
  // ----------------------------

  function load(key) {
    // hole String aus localStorage -> mache daraus Array
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  }

  function save(key, array) {
    localStorage.setItem(key, JSON.stringify(array));
  }

  // Kleiner Schutz, damit HTML nicht kaputt geht
  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // ----------------------------
  // RENDER: Notizen anzeigen
  // ----------------------------

  function renderNotes() {
    const notes = load(NOTES_KEY);

    if (!notesEl) return;

    if (notes.length === 0) {
      notesEl.innerHTML = `<p style="opacity:.7">Noch keine Notizen gespeichert.</p>`;
      return;
    }

    notesEl.innerHTML = notes
      .map((n) => {
        return `
          <div class="note-card">
            <div class="note-card__head">
              <h3 class="note-card__title">${escapeHtml(
                n.title || "Ohne Titel"
              )}</h3>
              <button data-action="trash" data-id="${n.id}">✕</button>
            </div>

            <p class="note-card__text">${escapeHtml(n.text).replaceAll(
              "\n",
              "<br>"
            )}</p>
            <small class="note-card__meta">${new Date(
              n.createdAt
            ).toLocaleString()}</small>
          </div>
        `;
      })
      .join("");
  }

  function renderTrash() {
    const trash = load(TRASH_KEY);

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
        .map((n) => {
          return `
            <div class="note-card">
              <div class="note-card__head">
                <h3 class="note-card__title">${escapeHtml(
                  n.title || "Ohne Titel"
                )}</h3>
                <div style="display:flex; gap:.5rem;">
                  <button data-action="restore" data-id="${
                    n.id
                  }">Wiederherstellen</button>
                  <button data-action="delete-forever" data-id="${
                    n.id
                  }">Löschen</button>
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
          `;
        })
        .join("")}
    `;
  }

  // ----------------------------
  // ACTIONS: Speichern / Löschen
  // ----------------------------

  function addNote() {
    const title = (titleEl?.value || "").trim();
    const text = (textEl?.value || "").trim();

    if (!text) {
      alert("Bitte eine Notiz eingeben.");
      return;
    }

    const notes = load(NOTES_KEY);

    notes.unshift({
      id: String(Date.now()), // reicht für Anfänger völlig
      title,
      text,
      createdAt: Date.now(),
    });

    save(NOTES_KEY, notes);

    if (titleEl) titleEl.value = "";
    if (textEl) textEl.value = "";

    renderNotes();
  }

  function moveToTrash(id) {
    const notes = load(NOTES_KEY);
    const trash = load(TRASH_KEY);

    // Note finden
    const note = notes.find((n) => n.id === id);
    if (!note) return;

    // Note aus Notes entfernen
    const notesWithout = notes.filter((n) => n.id !== id);
    save(NOTES_KEY, notesWithout);

    // Note in Trash hinzufügen
    trash.unshift({ ...note, deletedAt: Date.now() });
    save(TRASH_KEY, trash);

    renderNotes();
    renderTrash();
  }

  function restoreFromTrash(id) {
    const notes = load(NOTES_KEY);
    const trash = load(TRASH_KEY);

    const note = trash.find((n) => n.id === id);
    if (!note) return;

    // aus Trash entfernen
    const trashWithout = trash.filter((n) => n.id !== id);
    save(TRASH_KEY, trashWithout);

    // zurück in Notes (deletedAt weg)
    const { deletedAt, ...restored } = note;
    notes.unshift(restored);
    save(NOTES_KEY, notes);

    renderNotes();
    renderTrash();
  }

  function deleteForever(id) {
    const trash = load(TRASH_KEY);
    const trashWithout = trash.filter((n) => n.id !== id);
    save(TRASH_KEY, trashWithout);
    renderTrash();
  }

  function emptyTrash() {
    save(TRASH_KEY, []);
    renderTrash();
  }

  // ----------------------------
  // EVENTS: Klicks abfangen
  // ----------------------------

  saveBtn?.addEventListener("click", addNote);

  titleEl?.addEventListener("keydown", function (e) {
    if (e.key === "Enter") addNote();
  });

  notesEl?.addEventListener("click", function (e) {
    const btn = e.target.closest("[data-action='trash']");
    if (!btn) return;
    moveToTrash(btn.dataset.id);
  });

  trashEl?.addEventListener("click", function (e) {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;

    if (action === "restore") restoreFromTrash(id);
    if (action === "delete-forever") deleteForever(id);
    if (action === "empty-trash") emptyTrash();
  });

  // Start: einmal anzeigen
  renderNotes();
  renderTrash();
});
