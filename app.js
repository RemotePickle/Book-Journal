// ==========================================
// TEIL 1: Elemente, IndexedDB & Komprimierung
// ==========================================

const addBookButton = document.getElementById("addBookButton");
const closeDialogButton = document.getElementById("closeDialogButton");
const bookDialog = document.getElementById("bookDialog");
const bookForm = document.getElementById("bookForm");
const bookList = document.getElementById("bookList");

const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");

const exportButton = document.getElementById("exportButton");
const importInput = document.getElementById("importInput");

const coverUrlInput = document.getElementById("coverUrlInput");
const coverFileInput = document.getElementById("coverFileInput");
const coverPreview = document.getElementById("coverPreview");
const coverPlaceholder = document.getElementById("coverPlaceholder");

let selectedCover = "";
let editingBookId = null;
let books = [];

// -----------------------------
// IndexedDB Setup & Helfer
// -----------------------------
const DB_NAME = "MeineBibliothekDB";
const DB_VERSION = 1;
const STORE_NAME = "books";

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: "id" });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getAllBooksFromDB() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

async function saveBookToDB(book) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.put(book);

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function deleteBookFromDB(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.delete(id);

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function replaceAllBooksInDB(newBooks) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.clear();
        newBooks.forEach(book => store.put(book));

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

// -----------------------------
// Bildkomprimierung auf max. 400x600px
// -----------------------------
function compressImage(file, maxWidth = 400, maxHeight = 600, quality = 0.82) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            const img = new Image();

            img.onload = () => {
                let width = img.width;
                let height = img.height;

                const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);

                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);

                const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
                resolve(compressedDataUrl);
            };

            img.onerror = () => reject(new Error("Bild konnte nicht geladen werden."));
            img.src = event.target.result;
        };

        reader.onerror = () => reject(new Error("Datei konnte nicht gelesen werden."));
        reader.readAsDataURL(file);
    });
}
// ==========================================
// TEIL 2: Cover-Upload, Dialog & CRUD-Logik
// ==========================================

// -----------------------------
// Cover Vorschau & Upload
// -----------------------------
coverUrlInput.addEventListener("input", () => {
    const url = coverUrlInput.value.trim();

    if (url) {
        selectedCover = url;
        showCoverPreview(url);
    } else {
        selectedCover = "";
        hideCoverPreview();
    }
});

coverFileInput.addEventListener("change", async () => {
    const file = coverFileInput.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
        alert("Bitte wähle eine Bilddatei aus.");
        return;
    }

    try {
        selectedCover = await compressImage(file, 400, 600, 0.82);
        showCoverPreview(selectedCover);
        coverUrlInput.value = "";
    } catch (error) {
        console.error(error);
        alert("Das Bild konnte leider nicht verarbeitet werden.");
    }
});

function showCoverPreview(source) {
    coverPreview.src = source;
    coverPreview.hidden = false;
    coverPlaceholder.hidden = true;
}

function hideCoverPreview() {
    coverPreview.src = "";
    coverPreview.hidden = true;
    coverPlaceholder.hidden = false;
}

// -----------------------------
// Dialog öffnen / schließen
// -----------------------------
addBookButton.addEventListener("click", () => {
    editingBookId = null;
    bookForm.reset();
    selectedCover = "";
    hideCoverPreview();

    document.querySelector(".dialog-header h2").textContent = "Buch hinzufügen";
    document.querySelector(".save-button").textContent = "Buch speichern";

    bookDialog.showModal();
});

closeDialogButton.addEventListener("click", () => {
    bookDialog.close();
});

// -----------------------------
// Neues / Bearbeitetes Buch speichern
// -----------------------------
bookForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const bookData = {
        cover: selectedCover,
        title: document.getElementById("titleInput").value.trim(),
        author: document.getElementById("authorInput").value.trim(),
        status: document.getElementById("bookStatusInput").value,
        rating: Number(document.getElementById("ratingInput").value),
        series: document.getElementById("seriesInput").value.trim(),
        volume: document.getElementById("volumeInput").value.trim(),
        notes: document.getElementById("notesInput").value.trim()
    };

    let bookToSave;

    if (editingBookId === null) {
        bookToSave = {
            id: crypto.randomUUID(),
            createdAt: Date.now(),
            ...bookData
        };
        books.push(bookToSave);
    } else {
        const bookIndex = books.findIndex(book => book.id === editingBookId);
        if (bookIndex !== -1) {
            bookToSave = {
                ...books[bookIndex],
                ...bookData
            };
            books[bookIndex] = bookToSave;
        }
    }

    if (bookToSave) {
        await saveBookToDB(bookToSave);
    }

    bookForm.reset();
    selectedCover = "";
    editingBookId = null;
    hideCoverPreview();
    bookDialog.close();

    renderBooks();
});

// -----------------------------
// Bücher bearbeiten & löschen
// -----------------------------
function editBook(id) {
    const book = books.find(book => book.id === id);
    if (!book) return;

    editingBookId = id;

    document.getElementById("titleInput").value = book.title;
    document.getElementById("authorInput").value = book.author;
    document.getElementById("bookStatusInput").value = book.status;
    document.getElementById("ratingInput").value = book.rating;
    document.getElementById("seriesInput").value = book.series || "";
    document.getElementById("volumeInput").value = book.volume || "";
    document.getElementById("notesInput").value = book.notes || "";

    selectedCover = book.cover || "";

    if (selectedCover) {
        showCoverPreview(selectedCover);
        if (selectedCover.startsWith("http://") || selectedCover.startsWith("https://")) {
            coverUrlInput.value = selectedCover;
        } else {
            coverUrlInput.value = "";
        }
    } else {
        coverUrlInput.value = "";
        hideCoverPreview();
    }

    document.querySelector(".dialog-header h2").textContent = "Buch bearbeiten";
    document.querySelector(".save-button").textContent = "Änderungen speichern";

    bookDialog.showModal();
}

async function deleteBook(id) {
    await deleteBookFromDB(id);
    books = books.filter(book => book.id !== id);
    renderBooks();
}
// ==========================================
// TEIL 3: Export/Import, Darstellung & Start
// ==========================================

// -----------------------------
// Export & Import (JSON Backup)
// -----------------------------
if (exportButton) {
    exportButton.addEventListener("click", () => {
        if (books.length === 0) {
            alert("Es sind noch keine Bücher zum Exportieren vorhanden.");
            return;
        }

        const dataStr = JSON.stringify(books, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const date = new Date().toISOString().slice(0, 10);
        const link = document.createElement("a");
        link.href = url;
        link.download = `meine-bibliothek-backup-${date}.json`;
        link.click();

        URL.revokeObjectURL(url);
    });
}

if (importInput) {
    importInput.addEventListener("change", async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const importedBooks = JSON.parse(text);

            if (!Array.isArray(importedBooks)) {
                throw new Error("Ungültiges Dateiformat");
            }

            const validBooks = importedBooks.map(book => ({
                ...book,
                id: book.id || crypto.randomUUID()
            }));

            const replace = confirm(
                `${validBooks.length} Bücher gefunden.\n\n` +
                `Klicke auf "OK", um deine aktuelle Bibliothek zu ersetzen, oder auf "Abbrechen", um sie hinzuzufügen.`
            );

            if (replace) {
                books = validBooks;
                await replaceAllBooksInDB(books);
            } else {
                const existingIds = new Set(books.map(b => b.id));
                for (const book of validBooks) {
                    if (existingIds.has(book.id)) {
                        book.id = crypto.randomUUID();
                    }
                    books.push(book);
                    await saveBookToDB(book);
                }
            }

            renderBooks();
            alert("Backup erfolgreich importiert!");
        } catch (error) {
            console.error(error);
            alert("Die Backup-Datei konnte nicht gelesen werden.");
        } finally {
            importInput.value = "";
        }
    });
}

// -----------------------------
// Darstellung & Statistik
// -----------------------------
function getStatusText(status) {
    if (status === "wishlist") return "Möchte ich lesen";
    if (status === "reading") return "Lese ich";
    if (status === "finished") return "Gelesen";
    return "";
}

function getStars(rating) {
    if (rating === 0) return "Noch nicht bewertet";
    return "★".repeat(rating) + "☆".repeat(5 - rating);
}

function renderBooks() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedStatus = statusFilter.value;

    const filteredBooks = books.filter(book => {
        const matchesSearch =
            book.title.toLowerCase().includes(searchTerm) ||
            book.author.toLowerCase().includes(searchTerm) ||
            (book.series && book.series.toLowerCase().includes(searchTerm));

        const matchesStatus =
            selectedStatus === "all" ||
            book.status === selectedStatus;

        return matchesSearch && matchesStatus;
    });

    bookList.innerHTML = "";

    filteredBooks.forEach(book => {
        const card = document.createElement("article");
        card.className = "book-card";

        let seriesText = "";
        if (book.series) {
            seriesText = book.series;
            if (book.volume) {
                seriesText += ` · Band ${book.volume}`;
            }
        }

        card.innerHTML = `
            ${
                book.cover
                    ? `<img class="book-cover" src="${escapeHtml(book.cover)}" alt="Cover von ${escapeHtml(book.title)}">`
                    : `<div class="book-cover-placeholder">Kein Cover</div>`
            }
            <h3>${escapeHtml(book.title)}</h3>
            <p class="author">${escapeHtml(book.author)}</p>
            <span class="status">${getStatusText(book.status)}</span>
            <div class="rating">${getStars(book.rating)}</div>
            ${seriesText ? `<div class="series">${escapeHtml(seriesText)}</div>` : ""}
            ${book.notes ? `<p class="notes">${escapeHtml(book.notes)}</p>` : ""}
            <button class="edit-button" data-id="${book.id}">Bearbeiten</button>
            <button class="delete-button" data-id="${book.id}">Löschen</button>
        `;

        card.querySelector(".edit-button").addEventListener("click", () => editBook(book.id));
        card.querySelector(".delete-button").addEventListener("click", () => deleteBook(book.id));

        bookList.appendChild(card);
    });

    updateStats();
}

function updateStats() {
    document.getElementById("totalBooks").textContent = books.length;
    document.getElementById("finishedBooks").textContent = books.filter(book => book.status === "finished").length;
    document.getElementById("wishlistBooks").textContent = books.filter(book => book.status === "wishlist").length;
}

searchInput.addEventListener("input", renderBooks);
statusFilter.addEventListener("change", renderBooks);

function escapeHtml(text) {
    const element = document.createElement("div");
    element.textContent = text;
    return element.innerHTML;
}

// -----------------------------
// App-Start & Migration aus localStorage
// -----------------------------
async function initApp() {
    books = await getAllBooksFromDB();

    const legacyData = localStorage.getItem("books");
    if (legacyData) {
        try {
            const legacyBooks = JSON.parse(legacyData);
            if (Array.isArray(legacyBooks) && legacyBooks.length > 0) {
                for (const book of legacyBooks) {
                    if (!books.some(b => b.id === book.id)) {
                        books.push(book);
                        await saveBookToDB(book);
                    }
                }
            }
            localStorage.removeItem("books");
        } catch (e) {
            console.error("Fehler bei localStorage-Migration:", e);
        }
    }

    renderBooks();
}

initApp();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((err) => {
      console.error("Service Worker Registrierung fehlgeschlagen:", err);
    });
  });
}
