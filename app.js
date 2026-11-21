import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import {
    getFirestore,
    collection,
    doc,
    getDocs,
    setDoc,
    deleteDoc,
    writeBatch
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

// ==========================================
// FIREBASE KONFIGURATION
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyA6NjM18rWA0EEMl7RtJSXmTnhXTnv6nhY",
    authDomain: "bookshelf-8db81.firebaseapp.com",
    projectId: "bookshelf-8db81",
    storageBucket: "bookshelf-8db81.firebasestorage.app",
    messagingSenderId: "293131316582",
    appId: "1:293131316582:web:a53cf1a852895d7055eca7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;

// ==========================================
// TEIL 1: Elemente, Firebase & Komprimierung
// ==========================================

const authScreen = document.getElementById("authScreen");
const appContainer = document.getElementById("appContainer");
const loginForm = document.getElementById("loginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginError = document.getElementById("loginError");
const logoutButton = document.getElementById("logoutButton");

const addBookButton = document.getElementById("addBookButton");
const closeDialogButton = document.getElementById("closeDialogButton");
const bookDialog = document.getElementById("bookDialog");
const bookForm = document.getElementById("bookForm");
const bookList = document.getElementById("bookList");

const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const seriesFilter = document.getElementById("seriesFilter");

const exportButton = document.getElementById("exportButton");
const importInput = document.getElementById("importInput");

const coverUrlInput = document.getElementById("coverUrlInput");
const coverPreview = document.getElementById("coverPreview");
const coverPlaceholder = document.getElementById("coverPlaceholder");

const deleteDialog = document.getElementById("deleteDialog");
const deleteBookTitle = document.getElementById("deleteBookTitle");
const closeDeleteDialogButton = document.getElementById("closeDeleteDialogButton");
const cancelDeleteButton = document.getElementById("cancelDeleteButton");
const confirmDeleteButton = document.getElementById("confirmDeleteButton");

const tabBooksButton = document.getElementById("tabBooksButton");
const tabTbrButton = document.getElementById("tabTbrButton");
const tabSeriesButton = document.getElementById("tabSeriesButton");
const booksView = document.getElementById("booksView");
const tbrView = document.getElementById("tbrView");
const seriesView = document.getElementById("seriesView");
const tbrList = document.getElementById("tbrList");
const seriesOverviewList = document.getElementById("seriesOverviewList");

const detailsDialog = document.getElementById("detailsDialog");
const closeDetailsDialogButton = document.getElementById("closeDetailsDialogButton");
const detailsCloseFooterButton = document.getElementById("detailsCloseFooterButton");
const detailsEditButton = document.getElementById("detailsEditButton");

const formatInput = document.getElementById("formatInput");
const pagesFieldWrapper = document.getElementById("pagesFieldWrapper");
const audioDurationWrapper = document.getElementById("audioDurationWrapper");

const tbrCategoryFilter = document.getElementById("tbrCategoryFilter");
const tbrGenreFilter = document.getElementById("tbrGenreFilter");
const randomBookButton = document.getElementById("randomBookButton");
const randomPickContainer = document.getElementById("randomPickContainer");

const exportCsvButton = document.getElementById("exportCsvButton");
const importCsvInput = document.getElementById("importCsvInput");

const bookStatusInput = document.getElementById("bookStatusInput");
const releaseDateWrapper = document.getElementById("releaseDateWrapper");
const releaseYearWrapper = document.getElementById("releaseYearWrapper");
const fanfictionFilter = document.getElementById("fanfictionFilter");
const tbrFanfictionFilter = document.getElementById("tbrFanfictionFilter");

const sortOrderFilter = document.getElementById("sortOrderFilter");
const tbrSortOrderFilter = document.getElementById("tbrSortOrderFilter");

const tabStatsButton = document.getElementById("tabStatsButton");
const statsView = document.getElementById("statsView");
const statsYearFilter = document.getElementById("statsYearFilter");
const statsFanfictionFilter = document.getElementById("statsFanfictionFilter");
const statsDashboard = document.getElementById("statsDashboard");

let currentDetailsBookId = null;
let bookIdToDelete = null;
let selectedCover = "";
let editingBookId = null;
let books = [];

// -----------------------------
// Login & Logout Logik
// -----------------------------
if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        loginError.hidden = true;

        try {
            await signInWithEmailAndPassword(auth, loginEmail.value.trim(), loginPassword.value);
            loginForm.reset();
        } catch (error) {
            console.error("Login-Fehler:", error);
            loginError.textContent = "E-Mail oder Passwort ist falsch.";
            loginError.hidden = false;
        }
    });
}

if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
        await signOut(auth);
    });
}

// -----------------------------
// Cloud Firestore Helfer
// -----------------------------
function getUserBooksCollection() {
    if (!currentUser) throw new Error("Nicht eingeloggt");
    return collection(db, "users", currentUser.uid, "books");
}

async function getAllBooksFromDB() {
    const snapshot = await getDocs(getUserBooksCollection());
    return snapshot.docs.map(docSnap => docSnap.data());
}

async function saveBookToDB(book) {
    const bookRef = doc(getUserBooksCollection(), book.id);
    await setDoc(bookRef, book);
}

async function deleteBookFromDB(id) {
    const bookRef = doc(getUserBooksCollection(), id);
    await deleteDoc(bookRef);
}

async function replaceAllBooksInDB(newBooks) {
    const colRef = getUserBooksCollection();
    const existingSnap = await getDocs(colRef);
    const batch = writeBatch(db);

    existingSnap.docs.forEach(docSnap => batch.delete(docSnap.ref));
    newBooks.forEach(book => {
        const newRef = doc(colRef, book.id);
        batch.set(newRef, book);
    });

    await batch.commit();
}

// ==========================================
// TEIL 2: Cover-Upload, Dialog & CRUD-Logik
// ==========================================

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
// Format-Abhängige Felder umschalten
// -----------------------------
function updateFormatFieldsVisibility() {
    if (!formatInput) return;
    const isAudio = formatInput.value === "audiobook";

    if (pagesFieldWrapper) pagesFieldWrapper.hidden = isAudio;
    if (audioDurationWrapper) audioDurationWrapper.hidden = !isAudio;
}

function updateStatusFieldsVisibility() {
    if (!bookStatusInput) return;
    const isWishlist = bookStatusInput.value === "wishlist";

    if (releaseDateWrapper) releaseDateWrapper.hidden = !isWishlist;
    if (releaseYearWrapper) releaseYearWrapper.hidden = isWishlist;

    // Wenn von Leseliste auf Gelesen/Lese ich gewechselt wird: Jahr automatisch aus Erscheinungsdatum übernehmen
    if (!isWishlist) {
        const releaseDateVal = document.getElementById("releaseDateInput")?.value;
        const releaseYearEl = document.getElementById("releaseYearInput");
        if (releaseDateVal && releaseYearEl && !releaseYearEl.value) {
            releaseYearEl.value = releaseDateVal.slice(0, 4);
        }
    }
}

if (bookStatusInput) {
    bookStatusInput.addEventListener("change", updateStatusFieldsVisibility);
}


if (formatInput) {
    formatInput.addEventListener("change", updateFormatFieldsVisibility);
}



// -----------------------------
// Buch-Dialog öffnen / schließen
// -----------------------------
addBookButton.addEventListener("click", () => {
    editingBookId = null;
    bookForm.reset();
    selectedCover = "";
    hideCoverPreview();
    updateFormatFieldsVisibility();
    updateStatusFieldsVisibility();

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

        const formatValue = document.getElementById("formatInput").value;
    const isAudio = formatValue === "audiobook";

    const bookData = {
        cover: selectedCover,
        title: document.getElementById("titleInput").value.trim(),
        author: document.getElementById("authorInput").value.trim(),
        status: document.getElementById("bookStatusInput").value,
        rating: document.getElementById("ratingInput").value === "dnf"
            ? "dnf"
            : Number(document.getElementById("ratingInput").value),
        series: document.getElementById("seriesInput").value.trim(),
        volume: document.getElementById("volumeInput").value.trim(),
        category: document.getElementById("categoryInput").value,
        genre: document.getElementById("genreInput").value.trim(),
        format: formatValue,
        pages: !isAudio ? (Number(document.getElementById("pagesInput").value) || 0) : 0,
        audioHours: isAudio ? (Number(document.getElementById("audioHoursInput").value) || 0) : 0,
        audioMinutes: isAudio ? (Number(document.getElementById("audioMinutesInput").value) || 0) : 0,
        language: document.getElementById("languageInput").value,
        startDate: document.getElementById("startDateInput").value,
        finishedDate: document.getElementById("finishedDateInput").value,
        notes: document.getElementById("notesInput").value.trim(),
        quotes: document.getElementById("quotesInput").value.trim(),
        releaseDate: document.getElementById("releaseDateInput").value,
        releaseYear: Number(document.getElementById("releaseYearInput").value) || 0,
        isFanfiction: document.getElementById("fanfictionInput").checked,

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
// Bücher bearbeiten & löschen (mit Sicherheitsabfrage)
// -----------------------------
function editBook(id) {
    const book = books.find(book => book.id === id);
    if (!book) return;

    editingBookId = id;

    document.getElementById("titleInput").value = book.title;
    document.getElementById("authorInput").value = book.author;
    document.getElementById("bookStatusInput").value = book.status;
    document.getElementById("ratingInput").value = book.rating !== undefined ? String(book.rating) : "0";
    document.getElementById("seriesInput").value = book.series || "";
    document.getElementById("volumeInput").value = book.volume || "";
    document.getElementById("notesInput").value = book.notes || "";
    document.getElementById("categoryInput").value = book.category || "";
    document.getElementById("genreInput").value = book.genre || "";
    document.getElementById("formatInput").value = book.format || "";
    document.getElementById("pagesInput").value = book.pages || "";
    document.getElementById("audioHoursInput").value = book.audioHours || "";
    document.getElementById("audioMinutesInput").value = book.audioMinutes || "";
    document.getElementById("languageInput").value = book.language || "";
    document.getElementById("startDateInput").value = book.startDate || "";
    document.getElementById("finishedDateInput").value = book.finishedDate || "";
    document.getElementById("quotesInput").value = book.quotes || "";
    document.getElementById("releaseDateInput").value = book.releaseDate || "";
    document.getElementById("releaseYearInput").value = book.releaseYear || "";
    document.getElementById("fanfictionInput").checked = Boolean(book.isFanfiction);
    updateStatusFieldsVisibility();


    updateFormatFieldsVisibility();


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

function deleteBook(id) {
    const book = books.find(b => b.id === id);
    if (!book) return;

    bookIdToDelete = id;
    deleteBookTitle.textContent = `„${book.title}“`;
    deleteDialog.showModal();
}

function closeDeleteModal() {
    bookIdToDelete = null;
    deleteDialog.close();
}

closeDeleteDialogButton.addEventListener("click", closeDeleteModal);
cancelDeleteButton.addEventListener("click", closeDeleteModal);

confirmDeleteButton.addEventListener("click", async () => {
    if (!bookIdToDelete) return;

    await deleteBookFromDB(bookIdToDelete);
    books = books.filter(book => book.id !== bookIdToDelete);
    
    closeDeleteModal();
    renderBooks();
});

// -----------------------------
// Buchdetails anzeigen
// -----------------------------
// Hilfsfunktion für deutsches Datumsformat (TT.MM.JJJJ)
function formatGermanDate(isoDate) {
    if (!isoDate) return "";
    const [year, month, day] = isoDate.split("-");
    return `${day}.${month}.${year}`;
}

function showBookDetails(id) {
    const book = books.find(b => b.id === id);
    if (!book || !detailsDialog) return;

    currentDetailsBookId = id;

    const coverWrapper = document.getElementById("detailsCoverWrapper");
    if (book.cover) {
        coverWrapper.innerHTML = `<img class="details-cover" src="${escapeHtml(book.cover)}" alt="Cover von ${escapeHtml(book.title)}">`;
    } else {
        coverWrapper.innerHTML = `<div class="details-cover-placeholder">Kein Cover</div>`;
    }

    document.getElementById("detailsStatus").textContent = getStatusText(book.status);
    document.getElementById("detailsTitle").textContent = book.title;

    const authorEl = document.getElementById("detailsAuthor");
    authorEl.textContent = book.author || "";
    authorEl.hidden = !book.author;

    document.getElementById("detailsRating").innerHTML = getStars(book.rating);



    // Zusatzfelder sammeln
    const metaItems = [];

    if (book.category) {
        metaItems.push({
            label: "Kategorie",
            value: book.category === "fiction" ? "Fiction" : "Non-Fiction"
        });
    }

    if (book.genre) {
        metaItems.push({ label: "Genre", value: book.genre });
    }

    if (book.format) {
        const formatLabels = { book: "Buch", ebook: "eBook", audiobook: "Hörbuch" };
        metaItems.push({ label: "Format", value: formatLabels[book.format] || book.format });
    }

    if (book.format === "audiobook") {
        if (book.audioHours || book.audioMinutes) {
            const h = book.audioHours || 0;
            const m = String(book.audioMinutes || 0).padStart(2, "0");
            metaItems.push({ label: "Dauer", value: `${h}:${m} Std.` });
        }
    } else if (book.pages) {
        metaItems.push({ label: "Umfang", value: `${book.pages} Seiten` });
    }

    if (book.language) {
        const langLabels = { de: "Deutsch", en: "Englisch", it: "Italienisch" };
        metaItems.push({ label: "Sprache", value: langLabels[book.language] || book.language });
    }

    if (book.startDate) {
        metaItems.push({ label: "Begonnen am", value: formatGermanDate(book.startDate) });
    }

    if (book.finishedDate) {
        metaItems.push({ label: "Beendet am", value: formatGermanDate(book.finishedDate) });
    }

    if (book.isFanfiction) {
        metaItems.push({ label: "Typ", value: "Fanfiction" });
    }
    if (book.status === "wishlist" && book.releaseDate) {
        metaItems.push({ label: "Erscheinungsdatum", value: formatGermanDate(book.releaseDate) });
    } else if (book.releaseYear) {
        metaItems.push({ label: "Erscheinungsjahr", value: String(book.releaseYear) });
    }

    const seriesEl = document.getElementById("detailsSeries");
    if (book.series) {
        seriesEl.textContent = book.volume ? `${book.series} · Band ${book.volume}` : book.series;
        seriesEl.hidden = false;
    } else {
        seriesEl.textContent = "";
        seriesEl.hidden = true;
    }

    const extraFieldsEl = document.getElementById("detailsExtraFields");
    if (metaItems.length > 0) {
        extraFieldsEl.innerHTML = metaItems.map(item => `
            <div class="meta-item">
                <span class="meta-label">${escapeHtml(item.label)}</span>
                <span class="meta-value">${escapeHtml(String(item.value))}</span>
            </div>
        `).join("");
        extraFieldsEl.hidden = false;
    } else {
        extraFieldsEl.innerHTML = "";
        extraFieldsEl.hidden = true;
    }



    // Notizen
    const notesSection = document.getElementById("detailsNotesSection");
    const notesEl = document.getElementById("detailsNotes");
    if (book.notes) {
        notesEl.textContent = book.notes;
        notesSection.hidden = false;
    } else {
        notesEl.textContent = "";
        notesSection.hidden = true;
    }

    // Zitate
    const quotesSection = document.getElementById("detailsQuotesSection");
    const quotesEl = document.getElementById("detailsQuotes");
    if (book.quotes) {
        quotesEl.textContent = book.quotes;
        quotesSection.hidden = false;
    } else {
        quotesEl.textContent = "";
        quotesSection.hidden = true;
    }

    detailsDialog.showModal();
}


function closeDetailsModal() {
    currentDetailsBookId = null;
    detailsDialog.close();
}

if (closeDetailsDialogButton) closeDetailsDialogButton.addEventListener("click", closeDetailsModal);
if (detailsCloseFooterButton) detailsCloseFooterButton.addEventListener("click", closeDetailsModal);

if (detailsEditButton) {
    detailsEditButton.addEventListener("click", () => {
        const idToEdit = currentDetailsBookId;
        closeDetailsModal();
        if (idToEdit) editBook(idToEdit);
    });
}


// ==========================================
// TEIL 3: Export/Import, Darstellung & Start
// ==========================================

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
// CSV Export & Import für Google Sheets / Excel
// -----------------------------
const CSV_COLUMNS = [
    "id", "cover", "title", "author", "status", "rating", "series", "volume",
    "category", "genre", "format", "pages", "audioHours", "audioMinutes",
    "language", "startDate", "finishedDate", "releaseDate", "releaseYear",
    "isFanfiction", "notes", "quotes"
];

function escapeCsvCell(value) {
    const str = value === undefined || value === null ? "" : String(value);
    if (str.includes(";") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

function parseCsvText(text) {
    const rows = [];
    let currentRow = [];
    let currentCell = "";
    let insideQuotes = false;

    // BOM entfernen & Trennzeichen (Semikolon oder Komma) automatisch aus der Kopfzeile erkennen
    const cleanText = text.replace(/^\uFEFF/, "");
    const firstLine = cleanText.split(/\r?\n/)[0] || "";
    const delimiter = (firstLine.match(/;/g) || []).length >= (firstLine.match(/,/g) || []).length ? ";" : ",";

    for (let i = 0; i < cleanText.length; i++) {
        const char = cleanText[i];
        const nextChar = cleanText[i + 1];

        if (insideQuotes) {
            if (char === '"' && nextChar === '"') {
                currentCell += '"';
                i++;
            } else if (char === '"') {
                insideQuotes = false;
            } else {
                currentCell += char;
            }
        } else {
            if (char === '"') {
                insideQuotes = true;
            } else if (char === delimiter) {
                currentRow.push(currentCell);
                currentCell = "";
            } else if (char === "\r" && nextChar === "\n") {
                currentRow.push(currentCell);
                rows.push(currentRow);
                currentRow = [];
                currentCell = "";
                i++;
            } else if (char === "\n") {
                currentRow.push(currentCell);
                rows.push(currentRow);
                currentRow = [];
                currentCell = "";
            } else {
                currentCell += char;
            }
        }
    }

    if (currentCell !== "" || currentRow.length > 0) {
        currentRow.push(currentCell);
        rows.push(currentRow);
    }

    return rows.filter(row => row.some(cell => cell.trim() !== ""));
}


if (exportCsvButton) {
    exportCsvButton.addEventListener("click", () => {
        if (books.length === 0) {
            alert("Es sind noch keine Bücher zum Exportieren vorhanden.");
            return;
        }

        const headerLine = CSV_COLUMNS.join(";");
        const dataLines = books.map(book =>
            CSV_COLUMNS.map(col => escapeCsvCell(book[col])).join(";")
        );

        const csvContent = "\uFEFF" + [headerLine, ...dataLines].join("\r\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);

        const date = new Date().toISOString().slice(0, 10);
        const link = document.createElement("a");
        link.href = url;
        link.download = `meine-bibliothek-${date}.csv`;
        link.click();

        URL.revokeObjectURL(url);
    });
}

if (importCsvInput) {
    importCsvInput.addEventListener("change", async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const rows = parseCsvText(text);

            if (rows.length < 2) {
                throw new Error("Die CSV-Datei enthält keine Datenzeilen.");
            }

            const headers = rows[0].map(h => h.trim());
            const existingBooksMap = new Map(books.map(b => [b.id, b]));
            const importedBooks = [];

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                const rawObj = {};
                headers.forEach((header, idx) => {
                    rawObj[header] = (row[idx] || "").trim();
                });

                if (!rawObj.title) continue; // Leere Zeilen ohne Titel überspringen

                const bookId = rawObj.id || crypto.randomUUID();
                const oldBook = existingBooksMap.get(bookId);

                importedBooks.push({
                    id: bookId,
                    createdAt: oldBook?.createdAt || Date.now(),
                    cover: rawObj.cover || oldBook?.cover || "", // Bestehendes Cover bleibt erhalten!
                    title: rawObj.title,
                    author: rawObj.author || "",
                    status: ["wishlist", "reading", "finished"].includes(rawObj.status) ? rawObj.status : "wishlist",
                    rating: rawObj.rating === "dnf" ? "dnf" : (Number(rawObj.rating) || 0),
                    series: rawObj.series || "",
                    volume: rawObj.volume || "",
                    category: ["fiction", "non-fiction"].includes(rawObj.category) ? rawObj.category : "",
                    genre: rawObj.genre || "",
                    format: ["book", "ebook", "audiobook"].includes(rawObj.format) ? rawObj.format : "",
                    pages: Number(rawObj.pages) || 0,
                    audioHours: Number(rawObj.audioHours) || 0,
                    audioMinutes: Number(rawObj.audioMinutes) || 0,
                    language: ["de", "en", "it"].includes(rawObj.language) ? rawObj.language : "",
                    startDate: rawObj.startDate || "",
                    finishedDate: rawObj.finishedDate || "",
                    notes: rawObj.notes || "",
                    quotes: rawObj.quotes || "",
                    releaseDate: rawObj.releaseDate || "",
                    releaseYear: Number(rawObj.releaseYear) || 0,
                    isFanfiction: rawObj.isFanfiction.toLowerCase() === "true",

                });
            }

            if (importedBooks.length === 0) {
                alert("Es wurden keine gültigen Bücher in der CSV-Datei gefunden. Deine bestehenden Daten wurden nicht verändert.");
                return;
            }


            const replace = confirm(
                `${importedBooks.length} Bücher aus der CSV-Datei gelesen.\n\n` +
                `Klicke auf "OK", um deine Bibliothek damit zu aktualisieren/ersetzen, oder auf "Abbrechen", um abzubrechen.`
            );

            if (replace) {
                books = importedBooks;
                await replaceAllBooksInDB(books);
                renderBooks();
                alert("CSV-Daten erfolgreich in die Cloud übernommen!");
            }
        } catch (error) {
            console.error(error);
            alert("Die CSV-Datei konnte nicht verarbeitet werden: " + error.message);
        } finally {
            importCsvInput.value = "";
        }
    });
}


function getStatusText(status) {
    if (status === "wishlist") return "Möchte ich lesen";
    if (status === "reading") return "Lese ich";
    if (status === "finished") return "Gelesen";
    return "";
}

function getStars(rating) {
    if (rating === "dnf") {
        return `<span class="dnf-badge" title="Did Not Finish (Abgebrochen)">DNF</span>`;
    }

    const num = Number(rating) || 0;
    if (num <= 0) return "";

    const fullStarSvg = `<svg class="star-svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    const emptyStarSvg = `<svg class="star-svg empty" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    const halfStarSvg = `<span class="half-star-wrap">${emptyStarSvg}<span class="half-star-fill">${fullStarSvg}</span></span>`;

    let html = `<span class="star-row" aria-label="${num} von 5 Sternen">`;
    for (let i = 1; i <= 5; i++) {
        if (num >= i) {
            html += fullStarSvg;
        } else if (num >= i - 0.5) {
            html += halfStarSvg;
        } else {
            html += emptyStarSvg;
        }
    }
    html += `</span>`;
    return html;
}


function updateSeriesFilterOptions() {
    if (!seriesFilter) return;

    const currentSelection = seriesFilter.value;

    // Alle eingetragenen Serien sammeln, Duplikate entfernen und alphabetisch sortieren
    const uniqueSeries = [...new Set(
        books
            .map(book => (book.series || "").trim())
            .filter(series => series !== "")
    )].sort((a, b) => a.localeCompare(b, "de"));

    seriesFilter.innerHTML = `<option value="all">Alle Serien</option>`;

    uniqueSeries.forEach(series => {
        const option = document.createElement("option");
        option.value = series;
        option.textContent = series;
        seriesFilter.appendChild(option);
    });

    // Vorherige Auswahl beibehalten, falls die Serie noch existiert
    if (uniqueSeries.includes(currentSelection)) {
        seriesFilter.value = currentSelection;
    } else {
        seriesFilter.value = "all";
    }
}


function renderBooks() {
    updateSeriesFilterOptions();

    const searchTerm = searchInput.value.toLowerCase();
    const selectedStatus = statusFilter.value;
    const selectedSeries = seriesFilter ? seriesFilter.value : "all";
    const selectedFanfiction = fanfictionFilter ? fanfictionFilter.value : "all";


    let filteredBooks = books.filter(book => {
        // TBR-Bücher ("wishlist") gehören ausschließlich in den TBR-Tab
        if (book.status === "wishlist") return false;

        const matchesSearch =
            book.title.toLowerCase().includes(searchTerm) ||
            book.author.toLowerCase().includes(searchTerm) ||
            (book.series && book.series.toLowerCase().includes(searchTerm));

        const matchesStatus =
            selectedStatus === "all" ||
            book.status === selectedStatus;

        const matchesSeries =
            selectedSeries === "all" ||
            (book.series && book.series.trim() === selectedSeries);

        const matchesFanfiction =
            selectedFanfiction === "all" ||
            (selectedFanfiction === "only" && Boolean(book.isFanfiction)) ||
            (selectedFanfiction === "no" && !book.isFanfiction);

        return matchesSearch && matchesStatus && matchesSeries && matchesFanfiction;

    });


        const selectedSort = sortOrderFilter ? sortOrderFilter.value : "newest";

    // Wenn eine Serie gewählt ist: Bände automatisch aufsteigend sortieren (Band 1, 2, 3...)
    if (selectedSeries !== "all") {
        filteredBooks.sort((a, b) => {
            const volA = parseFloat(a.volume) || 9999;
            const volB = parseFloat(b.volume) || 9999;
            return volA - volB;
        });
    } else {
        filteredBooks.sort((a, b) => {
            if (selectedSort === "finished-desc") {
                if (!a.finishedDate && !b.finishedDate) return 0;
                if (!a.finishedDate) return 1;
                if (!b.finishedDate) return -1;
                return b.finishedDate.localeCompare(a.finishedDate);
            }
            if (selectedSort === "finished-asc") {
                if (!a.finishedDate && !b.finishedDate) return 0;
                if (!a.finishedDate) return 1;
                if (!b.finishedDate) return -1;
                return a.finishedDate.localeCompare(b.finishedDate);
            }
            if (selectedSort === "rating-desc") {
                const rA = a.rating === "dnf" ? -1 : (Number(a.rating) || 0);
                const rB = b.rating === "dnf" ? -1 : (Number(b.rating) || 0);
                return rB - rA;
            }
            if (selectedSort === "title-asc") {
                return (a.title || "").localeCompare(b.title || "", "de");
            }
            if (selectedSort === "author-asc") {
                return (a.author || "zzz").localeCompare(b.author || "zzz", "de");
            }
            // Standard ("newest"): zuletzt hinzugefügte zuerst
            return (b.createdAt || 0) - (a.createdAt || 0);
        });
    }


    bookList.innerHTML = "";

            // Kompakte SVG-Icons für die Formate
    const formatIcons = {
        book: `<span class="meta-pill icon-pill" title="Buch" aria-label="Buch">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
        </span>`,
        ebook: `<span class="meta-pill icon-pill" title="eBook" aria-label="eBook">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/>
                <line x1="12" x2="12.01" y1="18" y2="18"/>
            </svg>
        </span>`,
        audiobook: `<span class="meta-pill icon-pill" title="Hörbuch" aria-label="Hörbuch">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>
            </svg>
        </span>`
    };

    const langLabels = {
        de: "Deutsch",
        en: "Englisch",
        it: "Italienisch"
    };

    filteredBooks.forEach(book => {
        const card = document.createElement("article");
        const isDnf = book.rating === "dnf";
        const ratingNum = isDnf ? 0 : (Number(book.rating) || 0);
        const isFiveStars = ratingNum === 5;

        card.className = isFiveStars ? "book-card favorite-card" : "book-card";

        let seriesText = "";
        if (book.series) {
            seriesText = book.series;
            if (book.volume) {
                seriesText += ` · Band ${book.volume}`;
            }
        }

        // Format-Icon
        const formatTagHtml = book.format && formatIcons[book.format] ? formatIcons[book.format] : "";

        // Kategorie, Genre & Sprache
        const categoryLabel = book.category === "fiction" ? "Fiction" : book.category === "non-fiction" ? "Non-Fiction" : "";
        const genreLabel = (book.genre || "").trim();
        const languageLabel = book.language ? (langLabels[book.language] || book.language) : "";

        // Umfang (Seiten oder Hörbuch-Länge)
        let lengthLabel = "";
        if (book.format === "audiobook") {
            if (book.audioHours || book.audioMinutes) {
                const h = book.audioHours || 0;
                const m = String(book.audioMinutes || 0).padStart(2, "0");
                lengthLabel = `${h}:${m} Std.`;
            }
        } else if (book.pages) {
            lengthLabel = `${book.pages} S.`;
        }

        card.innerHTML = `
            <div class="cover-wrapper">
                ${
                    book.cover
                        ? `<img class="book-cover" src="${escapeHtml(book.cover)}" alt="Cover von ${escapeHtml(book.title)}">`
                        : `<div class="book-cover-placeholder">Kein Cover</div>`
                }
            </div>

            <h3>${escapeHtml(book.title)}</h3>
            ${book.author ? `<p class="author">${escapeHtml(book.author)}</p>` : ""}

            <div class="card-badges">
                <span class="status">${getStatusText(book.status)}</span>
                ${formatTagHtml}
                ${categoryLabel ? `<span class="meta-pill">${escapeHtml(categoryLabel)}</span>` : ""}
                ${genreLabel ? `<span class="meta-pill">${escapeHtml(genreLabel)}</span>` : ""}
                ${languageLabel ? `<span class="meta-pill">${escapeHtml(languageLabel)}</span>` : ""}
                ${lengthLabel ? `<span class="meta-pill">${escapeHtml(lengthLabel)}</span>` : ""}
                ${book.isFanfiction ? `<span class="meta-pill">Fanfiction</span>` : ""}
                ${book.releaseYear ? `<span class="meta-pill">${escapeHtml(String(book.releaseYear))}</span>` : ""}

            </div>

            ${(ratingNum > 0 || isDnf) ? `<div class="rating">${getStars(book.rating)}</div>` : ""}

            ${seriesText ? `<div class="series">${escapeHtml(seriesText)}</div>` : ""}
            ${book.finishedDate ? `<div class="finished-date">Beendet: ${formatGermanDate(book.finishedDate)}</div>` : ""}

            <div class="card-actions">
                <button class="details-button" data-id="${book.id}">Details</button>
                <div class="card-icon-group">
                    <button class="edit-button" data-id="${book.id}" aria-label="Buch bearbeiten" title="Bearbeiten">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                            <path d="m15 5 4 4"/>
                        </svg>
                    </button>
                    <button class="delete-button" data-id="${book.id}" aria-label="Buch löschen" title="Löschen">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 6h18"/>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                            <line x1="10" x2="10" y1="11" y2="17"/>
                            <line x1="14" x2="14" y1="11" y2="17"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        card.querySelector(".details-button").addEventListener("click", () => showBookDetails(book.id));
        card.querySelector(".edit-button").addEventListener("click", () => editBook(book.id));
        card.querySelector(".delete-button").addEventListener("click", () => deleteBook(book.id));

        bookList.appendChild(card);
    });



    updateStats();
    renderTbrBooks();
    renderSeriesOverview();
    renderStatisticsPage();
}


function updateStats() {
    document.getElementById("totalBooks").textContent = books.length;
    document.getElementById("finishedBooks").textContent = books.filter(book => book.status === "finished").length;
    document.getElementById("wishlistBooks").textContent = books.filter(book => book.status === "wishlist").length;
}

// -----------------------------
// Tab-Umschaltung (Alle Bücher / TBR / Serien)
// -----------------------------
function switchView(activeView) {
    if (!booksView || !tbrView || !seriesView || !statsView) return;

    tabBooksButton.classList.toggle("active", activeView === "books");
    tabTbrButton.classList.toggle("active", activeView === "tbr");
    tabSeriesButton.classList.toggle("active", activeView === "series");
    tabStatsButton.classList.toggle("active", activeView === "stats");

    booksView.hidden = activeView !== "books";
    tbrView.hidden = activeView !== "tbr";
    seriesView.hidden = activeView !== "series";
    statsView.hidden = activeView !== "stats";

    if (activeView === "tbr") renderTbrBooks();
    if (activeView === "series") renderSeriesOverview();
    if (activeView === "stats") renderStatisticsPage();
}


if (tabBooksButton && tabTbrButton && tabSeriesButton && tabStatsButton) {
    tabBooksButton.addEventListener("click", () => switchView("books"));
    tabTbrButton.addEventListener("click", () => switchView("tbr"));
    tabSeriesButton.addEventListener("click", () => switchView("series"));
    tabStatsButton.addEventListener("click", () => switchView("stats"));
}


// -----------------------------
// TBR-Ansicht (Nur "Möchte ich lesen" mit Fokus auf Notiz, Kategorie & Genre)
// -----------------------------
// -----------------------------
// Leseliste (TBR): Filter & Intelligenter Zufallsgenerator
// -----------------------------
function updateTbrGenreOptions(allTbrBooks) {
    if (!tbrGenreFilter) return;

    const currentSelection = tbrGenreFilter.value;
    const uniqueGenres = [...new Set(
        allTbrBooks
            .map(b => (b.genre || "").trim())
            .filter(g => g !== "")
    )].sort((a, b) => a.localeCompare(b, "de"));

    tbrGenreFilter.innerHTML = `<option value="all">Alle Genres</option>`;
    uniqueGenres.forEach(genre => {
        const option = document.createElement("option");
        option.value = genre;
        option.textContent = genre;
        tbrGenreFilter.appendChild(option);
    });

    if (uniqueGenres.includes(currentSelection)) {
        tbrGenreFilter.value = currentSelection;
    } else {
        tbrGenreFilter.value = "all";
    }
}

function getFilteredTbrBooks() {
    const allTbrBooks = books.filter(book => book.status === "wishlist");
    updateTbrGenreOptions(allTbrBooks);

    const selectedCategory = tbrCategoryFilter ? tbrCategoryFilter.value : "all";
    const selectedGenre = tbrGenreFilter ? tbrGenreFilter.value : "all";
    const selectedFanfiction = tbrFanfictionFilter ? tbrFanfictionFilter.value : "all";


        const selectedTbrSort = tbrSortOrderFilter ? tbrSortOrderFilter.value : "newest";

    const filtered = allTbrBooks.filter(book => {
        const matchesCategory =
            selectedCategory === "all" ||
            book.category === selectedCategory;

        const matchesGenre =
            selectedGenre === "all" ||
            (book.genre && book.genre.trim() === selectedGenre);

        const matchesFanfiction =
            selectedFanfiction === "all" ||
            (selectedFanfiction === "only" && Boolean(book.isFanfiction)) ||
            (selectedFanfiction === "no" && !book.isFanfiction);

        return matchesCategory && matchesGenre && matchesFanfiction;
    });

    filtered.sort((a, b) => {
        if (selectedTbrSort === "release-asc") {
            if (!a.releaseDate && !b.releaseDate) return 0;
            if (!a.releaseDate) return 1; // Bücher ohne Datum nach hinten
            if (!b.releaseDate) return -1;
            return a.releaseDate.localeCompare(b.releaseDate);
        }
        if (selectedTbrSort === "title-asc") {
            return (a.title || "").localeCompare(b.title || "", "de");
        }
        if (selectedTbrSort === "author-asc") {
            return (a.author || "zzz").localeCompare(b.author || "zzz", "de");
        }
        return (b.createdAt || 0) - (a.createdAt || 0);
    });

    return filtered;

}

// Prüft, ob ein Buch als Nächstes dran ist (bei Serien nur der allererste ungelesene Band)
function isEligibleForRandomPick(book) {
    const seriesName = (book.series || "").trim().toLowerCase();
    if (!seriesName) return true; // Einzelbände sind immer wählbar

    // Alle Bücher dieser Serie (egal ob schon gelesen, aktuell oder auf der Leseliste)
    const allBooksInSeries = books.filter(
        b => (b.series || "").trim().toLowerCase() === seriesName
    );

    // Alle Bände dieser Serie, die noch NICHT gelesen wurden
    const unreadInSeries = allBooksInSeries.filter(b => b.status !== "finished");
    if (unreadInSeries.length === 0) return false;

    // Niedrigste Bandnummer unter den ungelesenen Bänden ermitteln
    const minUnreadVolume = Math.min(
        ...unreadInSeries.map(b => parseFloat(b.volume) || 9999)
    );

    const bookVolume = parseFloat(book.volume) || 9999;
    return bookVolume === minUnreadVolume;
}

function pickRandomTbrBook() {
    if (!randomPickContainer) return;

    const filteredTbr = getFilteredTbrBooks();
    const candidates = filteredTbr.filter(isEligibleForRandomPick);

    if (candidates.length === 0) {
        randomPickContainer.innerHTML = `
            <div class="random-pick-header">
                <span class="random-pick-badge">Keine Auswahl möglich</span>
                <button type="button" id="closeRandomPickBtn" class="icon-button" aria-label="Schließen">×</button>
            </div>
            <p style="margin: 0; color: var(--secondary-text);">
                Für diese Filterauswahl gibt es aktuell kein passendes Buch (oder bei Serien fehlt noch ein früherer Band).
            </p>
        `;
        randomPickContainer.hidden = false;
        document.getElementById("closeRandomPickBtn").addEventListener("click", () => {
            randomPickContainer.hidden = true;
        });
        return;
    }

    const randomIndex = Math.floor(Math.random() * candidates.length);
    const chosenBook = candidates[randomIndex];

    const categoryLabel = chosenBook.category === "fiction" ? "Fiction" : chosenBook.category === "non-fiction" ? "Non-Fiction" : "";
    const genreLabel = (chosenBook.genre || "").trim();
    const seriesText = chosenBook.series
        ? (chosenBook.volume ? `${chosenBook.series} · Band ${chosenBook.volume}` : chosenBook.series)
        : "";

    randomPickContainer.innerHTML = `
        <div class="random-pick-header">
            <span class="random-pick-badge">✨ Deine nächste Lektüre</span>
            <button type="button" id="closeRandomPickBtn" class="icon-button" aria-label="Schließen">×</button>
        </div>
        <div class="random-pick-body">
            ${chosenBook.cover ? `<img class="random-pick-cover" src="${escapeHtml(chosenBook.cover)}" alt="Cover">` : ""}
            <div class="random-pick-info">
                <h3>${escapeHtml(chosenBook.title)}</h3>
                ${chosenBook.author ? `<p class="author">${escapeHtml(chosenBook.author)}</p>` : ""}
                <div class="card-badges">
                    ${categoryLabel ? `<span class="meta-pill">${escapeHtml(categoryLabel)}</span>` : ""}
                    ${genreLabel ? `<span class="meta-pill">${escapeHtml(genreLabel)}</span>` : ""}
                    ${seriesText ? `<span class="meta-pill">${escapeHtml(seriesText)}</span>` : ""}
                </div>
                ${chosenBook.notes ? `<p class="notes">${escapeHtml(chosenBook.notes)}</p>` : ""}
                <div class="random-pick-actions">
                    <button type="button" id="randomDetailsBtn" class="secondary-button">Details ansehen</button>
                    <button type="button" id="randomAgainBtn" class="primary-button">🎲 Nochmal ziehen</button>
                </div>
            </div>
        </div>
    `;

    randomPickContainer.hidden = false;

    document.getElementById("closeRandomPickBtn").addEventListener("click", () => {
        randomPickContainer.hidden = true;
    });
    document.getElementById("randomDetailsBtn").addEventListener("click", () => {
        showBookDetails(chosenBook.id);
    });
    document.getElementById("randomAgainBtn").addEventListener("click", pickRandomTbrBook);
}

if (tbrCategoryFilter) {
    tbrCategoryFilter.addEventListener("change", () => {
        if (randomPickContainer) randomPickContainer.hidden = true;
        renderTbrBooks();
    });
}

if (tbrGenreFilter) {
    tbrGenreFilter.addEventListener("change", () => {
        if (randomPickContainer) randomPickContainer.hidden = true;
        renderTbrBooks();
    });
}

if (randomBookButton) {
    randomBookButton.addEventListener("click", pickRandomTbrBook);
}

function renderTbrBooks() {
    if (!tbrList) return;

    const tbrBooks = getFilteredTbrBooks();
    tbrList.innerHTML = "";

    if (tbrBooks.length === 0) {
        tbrList.innerHTML = `
            <div class="empty-series-hint" style="grid-column: 1 / -1;">
                Keine passenden Bücher auf deiner Leseliste gefunden.
            </div>
        `;
        return;
    }

    tbrBooks.forEach(book => {
        const card = document.createElement("article");
        card.className = "book-card";

        const categoryLabel = book.category === "fiction" ? "Fiction" : book.category === "non-fiction" ? "Non-Fiction" : "";
        const genreLabel = (book.genre || "").trim();

        card.innerHTML = `
            <div class="cover-wrapper">
                ${
                    book.cover
                        ? `<img class="book-cover" src="${escapeHtml(book.cover)}" alt="Cover von ${escapeHtml(book.title)}">`
                        : `<div class="book-cover-placeholder">Kein Cover</div>`
                }
            </div>

            <h3>${escapeHtml(book.title)}</h3>
            ${book.author ? `<p class="author">${escapeHtml(book.author)}</p>` : ""}

            ${
              (categoryLabel || genreLabel || book.isFanfiction || book.releaseDate)
                  ? `<div class="card-badges">
                      ${categoryLabel ? `<span class="meta-pill">${escapeHtml(categoryLabel)}</span>` : ""}
                      ${genreLabel ? `<span class="meta-pill">${escapeHtml(genreLabel)}</span>` : ""}
                      ${book.isFanfiction ? `<span class="meta-pill">Fanfiction</span>` : ""}
                      ${book.releaseDate ? `<span class="meta-pill">Erscheint: ${formatGermanDate(book.releaseDate)}</span>` : ""}
                     </div>`
                  : ""
            }


            ${book.notes ? `<p class="notes">${escapeHtml(book.notes)}</p>` : ""}

            <div class="card-actions">
                <button class="details-button" data-id="${book.id}">Details</button>
                <div class="card-icon-group">
                    <button class="edit-button" data-id="${book.id}" aria-label="Buch bearbeiten" title="Bearbeiten">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                            <path d="m15 5 4 4"/>
                        </svg>
                    </button>
                    <button class="delete-button" data-id="${book.id}" aria-label="Buch löschen" title="Löschen">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 6h18"/>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                            <line x1="10" x2="10" y1="11" y2="17"/>
                            <line x1="14" x2="14" y1="11" y2="17"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        card.querySelector(".details-button").addEventListener("click", () => showBookDetails(book.id));
        card.querySelector(".edit-button").addEventListener("click", () => editBook(book.id));
        card.querySelector(".delete-button").addEventListener("click", () => deleteBook(book.id));

        tbrList.appendChild(card);
    });
}



function renderSeriesOverview() {
    if (!seriesOverviewList) return;

    // Bücher nach Serienname gruppieren
    const seriesMap = new Map();

    books.forEach(book => {
        const seriesName = (book.series || "").trim();
        if (!seriesName) return;

        if (!seriesMap.has(seriesName)) {
            seriesMap.set(seriesName, []);
        }
        seriesMap.get(seriesName).push(book);
    });

    seriesOverviewList.innerHTML = "";

    if (seriesMap.size === 0) {
        seriesOverviewList.innerHTML = `
            <div class="empty-series-hint">
                Du hast noch keine Bücher einer Serie zugeordnet.<br>
                Trage beim Bearbeiten eines Buches einfach einen Seriennamen ein.
            </div>
        `;
        return;
    }

    // Serien alphabetisch sortieren
    const sortedSeriesNames = [...seriesMap.keys()].sort((a, b) => a.localeCompare(b, "de"));

    sortedSeriesNames.forEach(seriesName => {
        const seriesBooks = seriesMap.get(seriesName);

        // Bände aufsteigend nach Bandnummer sortieren
        seriesBooks.sort((a, b) => {
            const volA = parseFloat(a.volume) || 9999;
            const volB = parseFloat(b.volume) || 9999;
            return volA - volB;
        });

        const finishedCount = seriesBooks.filter(b => b.status === "finished").length;

        const card = document.createElement("article");
        card.className = "series-card";

        const listItemsHtml = seriesBooks.map(book => {
            const isFinished = book.status === "finished";
            const volumeLabel = book.volume ? `<span class="series-volume-tag">Band ${escapeHtml(book.volume)}:</span>` : "";

            return `
                <li class="series-book-item clickable-series-book" data-id="${book.id}" role="button" tabindex="0">
                    <span class="check-icon ${isFinished ? "done" : "open"}">
                        ${isFinished ? "✓" : ""}
                    </span>
                    <span class="series-book-title ${isFinished ? "done" : ""}">
                        ${volumeLabel}${escapeHtml(book.title)}
                    </span>
                </li>
            `;
        }).join("");

        card.innerHTML = `
            <div class="series-card-header">
                <h3>${escapeHtml(seriesName)}</h3>
                <span class="series-progress">${finishedCount} / ${seriesBooks.length} gelesen</span>
            </div>
            <ul class="series-book-list">
                ${listItemsHtml}
            </ul>
        `;

        card.querySelectorAll(".clickable-series-book").forEach(item => {
            item.addEventListener("click", () => showBookDetails(item.dataset.id));
        });

        seriesOverviewList.appendChild(card);

    });
}

// -----------------------------
// Statistik-Unterseite berechnen & rendern
// -----------------------------
function updateStatsYearOptions() {
    if (!statsYearFilter) return;

    const currentSelection = statsYearFilter.value;
    const years = [...new Set(
        books
            .filter(b => b.status === "finished" && b.finishedDate)
            .map(b => b.finishedDate.slice(0, 4))
    )].sort((a, b) => b.localeCompare(a));

    statsYearFilter.innerHTML = `<option value="all">Zeitraum: Gesamt</option>`;
    years.forEach(year => {
        const option = document.createElement("option");
        option.value = year;
        option.textContent = `Jahr ${year}`;
        statsYearFilter.appendChild(option);
    });

    if (years.includes(currentSelection)) {
        statsYearFilter.value = currentSelection;
    } else {
        statsYearFilter.value = "all";
    }
}

function buildBarPanelHtml(title, entries, totalCount, isGold = false) {
    if (entries.length === 0) {
        return `
            <div class="stats-panel">
                <h3>${escapeHtml(title)}</h3>
                <p style="margin: 0; font-size: 13px; color: var(--secondary-text);">Noch keine Daten vorhanden.</p>
            </div>
        `;
    }

    const maxVal = Math.max(...entries.map(e => e.count), 1);

    const rowsHtml = entries.map(item => {
        const widthPercent = Math.round((item.count / maxVal) * 100);
        const sharePercent = totalCount > 0 ? Math.round((item.count / totalCount) * 100) : 0;
        const valueLabel = item.customLabel || `${item.count} (${sharePercent} %)`;

        return `
            <div class="bar-row">
                <div class="bar-label-row">
                    <span class="bar-label-name">${escapeHtml(item.label)}</span>
                    <span class="bar-label-value">${escapeHtml(valueLabel)}</span>
                </div>
                <div class="bar-track">
                    <div class="bar-fill ${isGold ? "gold" : ""}" style="width: ${widthPercent}%"></div>
                </div>
            </div>
        `;
    }).join("");

    return `
        <div class="stats-panel">
            <h3>${escapeHtml(title)}</h3>
            <div class="bar-list">${rowsHtml}</div>
        </div>
    `;
}

const CHART_COLORS = [
    "#4f6b5a", // Salbeigrün (deine Hauptfarbe)
    "#d49d27", // Warmes Gold
    "#7c9a87", // Helles Salbei
    "#c97b53", // Terrakotta
    "#6b8299", // Schieferblau
    "#9c8265", // Warmes Taupe
    "#b5a692"  // Sandgrau
];

function buildDonutPanelHtml(title, entries, totalCount) {
    if (entries.length === 0 || totalCount === 0) {
        return `
            <div class="stats-panel">
                <h3>${escapeHtml(title)}</h3>
                <p style="margin: 0; font-size: 13px; color: var(--secondary-text);">Noch keine Daten vorhanden.</p>
            </div>
        `;
    }

    let currentDeg = 0;
    const gradientParts = [];

    const legendHtml = entries.map((item, idx) => {
        const color = CHART_COLORS[idx % CHART_COLORS.length];
        const share = item.count / totalCount;
        const sharePercent = Math.round(share * 100);
        const deg = share * 360;

        gradientParts.push(`${color} ${currentDeg.toFixed(1)}deg ${(currentDeg + deg).toFixed(1)}deg`);
        currentDeg += deg;

        return `
            <div class="legend-item">
                <span class="legend-left">
                    <span class="legend-dot" style="background: ${color};"></span>
                    <span>${escapeHtml(item.label)}</span>
                </span>
                <span class="legend-value">${item.count} (${sharePercent} %)</span>
            </div>
        `;
    }).join("");

    // Falls durch Rundung minimal weniger als 360° erreicht wurden, sauber schließen
    if (currentDeg < 360 && entries.length > 0) {
        const lastColor = CHART_COLORS[(entries.length - 1) % CHART_COLORS.length];
        gradientParts.push(`${lastColor} ${currentDeg.toFixed(1)}deg 360deg`);
    }

    const gradientCss = `conic-gradient(${gradientParts.join(", ")})`;

    return `
        <div class="stats-panel">
            <h3>${escapeHtml(title)}</h3>
            <div class="donut-layout">
                <div class="donut-chart" style="background: ${gradientCss};">
                    <div class="donut-hole">
                        <span class="donut-total-num">${totalCount}</span>
                        <span class="donut-total-label">Bücher</span>
                    </div>
                </div>
                <div class="donut-legend">
                    ${legendHtml}
                </div>
            </div>
        </div>
    `;
}

function buildRatingColumnChartHtml(finishedBooks) {
    const slots = [
        { key: "dnf", label: "DNF", isDnf: true },
        { key: "0.5", label: "0,5" },
        { key: "1", label: "1" },
        { key: "1.5", label: "1,5" },
        { key: "2", label: "2" },
        { key: "2.5", label: "2,5" },
        { key: "3", label: "3" },
        { key: "3.5", label: "3,5" },
        { key: "4", label: "4" },
        { key: "4.5", label: "4,5" },
        { key: "5", label: "5 ★" }
    ];

    const counts = new Map(slots.map(s => [s.key, 0]));
    let unratedCount = 0;

    finishedBooks.forEach(b => {
        if (b.rating === "dnf") {
            counts.set("dnf", counts.get("dnf") + 1);
        } else {
            const num = Number(b.rating) || 0;
            if (num > 0) {
                const key = String(num);
                if (counts.has(key)) {
                    counts.set(key, counts.get(key) + 1);
                }
            } else {
                unratedCount++;
            }
        }
    });

    const maxCount = Math.max(...counts.values(), 1);

    const columnsHtml = slots.map(slot => {
        const count = counts.get(slot.key) || 0;
        const heightPercent = count > 0 ? Math.max(Math.round((count / maxCount) * 100), 8) : 2;
        const barClasses = [
            "col-bar",
            slot.isDnf ? "dnf" : "",
            count === 0 ? "empty" : ""
        ].filter(Boolean).join(" ");

        return `
            <div class="col-item" title="${slot.label}: ${count} Bücher">
                <div class="col-bar-area">
                    <span class="col-count ${count === 0 ? "zero" : ""}">${count}</span>
                    <div class="${barClasses}" style="height: ${heightPercent}%"></div>
                </div>
                <span class="col-label">${escapeHtml(slot.label)}</span>
            </div>
        `;
    }).join("");

    const unratedHint = unratedCount > 0
        ? `<span style="font-size: 12px; font-weight: 500; color: var(--secondary-text);"> · ${unratedCount} ohne Bewertung</span>`
        : "";

    return `
        <div class="stats-panel">
            <h3>Bewertungen${unratedHint}</h3>
            <div class="column-chart">${columnsHtml}</div>
        </div>
    `;
}


function renderStatisticsPage() {
    if (!statsDashboard) return;

    updateStatsYearOptions();

    const selectedYear = statsYearFilter ? statsYearFilter.value : "all";
    const selectedFf = statsFanfictionFilter ? statsFanfictionFilter.value : "all";

    // Basis: Alle gelesenen Bücher (inkl. DNF, falls als gelesen/abgebrochen erfasst)
    const finishedBooks = books.filter(book => {
        if (book.status !== "finished") return false;

        if (selectedYear !== "all") {
            if (!book.finishedDate || !book.finishedDate.startsWith(selectedYear)) return false;
        }

        if (selectedFf === "only" && !book.isFanfiction) return false;
        if (selectedFf === "no" && book.isFanfiction) return false;

        return true;
    });

    if (finishedBooks.length === 0) {
        statsDashboard.innerHTML = `
            <div class="empty-series-hint">
                Für diese Auswahl sind noch keine gelesenen Bücher vorhanden.
            </div>
        `;
        return;
    }

    // 1. KPI-Berechnungen
    const dnfCount = finishedBooks.filter(b => b.rating === "dnf").length;
    const completedCount = finishedBooks.length - dnfCount;

    const ratedBooks = finishedBooks.filter(b => b.rating !== "dnf" && Number(b.rating) > 0);
    const avgRating = ratedBooks.length > 0
        ? (ratedBooks.reduce((sum, b) => sum + Number(b.rating), 0) / ratedBooks.length).toFixed(2).replace(".", ",")
        : "–";

    const pageBooks = finishedBooks.filter(b => b.format !== "audiobook" && Number(b.pages) > 0);
    const totalPages = pageBooks.reduce((sum, b) => sum + Number(b.pages), 0);
    const avgPages = pageBooks.length > 0 ? Math.round(totalPages / pageBooks.length) : 0;

    const audioBooks = finishedBooks.filter(b => b.format === "audiobook");
    const totalAudioMinutes = audioBooks.reduce(
        (sum, b) => sum + (Number(b.audioHours) || 0) * 60 + (Number(b.audioMinutes) || 0),
        0
    );
    const audioHoursTotal = Math.floor(totalAudioMinutes / 60);
    const audioMinutesRest = String(totalAudioMinutes % 60).padStart(2, "0");

    // Durchschnittliche Lesedauer in Tagen
    const durationsInDays = finishedBooks
        .filter(b => b.startDate && b.finishedDate)
        .map(b => {
            const start = new Date(b.startDate);
            const end = new Date(b.finishedDate);
            const diff = Math.round((end - start) / (1000 * 60 * 60 * 24));
            return diff >= 0 ? diff + 1 : null;
        })
        .filter(d => d !== null);

    const avgDays = durationsInDays.length > 0
        ? (durationsInDays.reduce((a, b) => a + b, 0) / durationsInDays.length).toFixed(1).replace(".", ",")
        : "–";

    // 2. Verteilungen sammeln
    const countBy = (items, keyFn) => {
        const map = new Map();
        items.forEach(item => {
            const key = keyFn(item);
            if (!key) return;
            map.set(key, (map.get(key) || 0) + 1);
        });
        return [...map.entries()]
            .map(([label, count]) => ({ label, count }))
            .sort((a, b) => b.count - a.count);
    };

    // Monate (1–12)
    const monthNames = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
    const monthCounts = new Array(12).fill(0);
    finishedBooks.forEach(b => {
        if (b.finishedDate && b.finishedDate.length >= 7) {
            const mIdx = parseInt(b.finishedDate.slice(5, 7), 10) - 1;
            if (mIdx >= 0 && mIdx < 12) monthCounts[mIdx]++;
        }
    });
    const monthEntries = monthNames
        .map((label, idx) => ({ label, count: monthCounts[idx], customLabel: `${monthCounts[idx]}` }))
        .filter(m => selectedYear !== "all" || m.count > 0);

    // Genres (Top 8)
    const genreEntries = countBy(finishedBooks, b => (b.genre || "").trim()).slice(0, 8);

    // Fiction vs. Non-Fiction
    const categoryEntries = countBy(finishedBooks, b =>
        b.category === "fiction" ? "Fiction" : b.category === "non-fiction" ? "Non-Fiction" : "Keine Angabe"
    );

    // Formate
    const formatNames = { book: "Buch", ebook: "eBook", audiobook: "Hörbuch" };
    const formatEntries = countBy(finishedBooks, b => formatNames[b.format] || "Keine Angabe");

    // Sprachen
    const langNames = { de: "Deutsch", en: "Englisch", it: "Italienisch" };
    const langEntries = countBy(finishedBooks, b => langNames[b.language] || "Keine Angabe");

    // Bewertungen
    const ratingMap = new Map();
    finishedBooks.forEach(b => {
        const label = b.rating === "dnf" ? "DNF" : Number(b.rating) > 0 ? `${String(b.rating).replace(".", ",")} ★` : "Unbewertet";
        ratingMap.set(label, (ratingMap.get(label) || 0) + 1);
    });
    const ratingEntries = [...ratingMap.entries()]
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => {
            if (a.label === "Unbewertet") return 1;
            if (b.label === "Unbewertet") return -1;
            if (a.label === "DNF") return 1;
            if (b.label === "DNF") return -1;
            return parseFloat(b.label.replace(",", ".")) - parseFloat(a.label.replace(",", "."));
        });

    // Erscheinungs-Jahrzehnte (inkl. "Keine Angabe", damit der Kreis 100 % ergibt)
    const decadeEntries = countBy(finishedBooks, b => {
        const y = Number(b.releaseYear);
        if (!y) return "Keine Angabe";
        if (y < 1980) return "Vor 1980";
        const decade = Math.floor(y / 10) * 10;
        return `${decade}er`;
    });


    // 3. HTML zusammensetzen
    statsDashboard.innerHTML = `
        <div class="stats-kpi-grid">
            <div class="stats-kpi-card">
                <span class="stats-kpi-value">${completedCount}</span>
                <span class="stats-kpi-label">Gelesene Bücher</span>
                <span class="stats-kpi-sub">Ø ${avgRating} ★${dnfCount > 0 ? ` · ${dnfCount} DNF` : ""}</span>
            </div>

            <div class="stats-kpi-card">
                <span class="stats-kpi-value">${totalPages.toLocaleString("de-DE")}</span>
                <span class="stats-kpi-label">Gelesene Seiten</span>
                <span class="stats-kpi-sub">Ø ${avgPages} Seiten / Buch</span>
            </div>

            <div class="stats-kpi-card">
                <span class="stats-kpi-value">${audioHoursTotal}:${audioMinutesRest}</span>
                <span class="stats-kpi-label">Hörbuch-Stunden</span>
                <span class="stats-kpi-sub">${audioBooks.length} Hörbücher</span>
            </div>

            <div class="stats-kpi-card">
                <span class="stats-kpi-value">${avgDays}</span>
                <span class="stats-kpi-label">Ø Tage pro Buch</span>
                <span class="stats-kpi-sub">Basierend auf ${durationsInDays.length} Büchern</span>
            </div>
        </div>

        <div class="stats-charts-grid">
            ${buildBarPanelHtml(selectedYear === "all" ? "Bücher nach Monat (Gesamt)" : `Lesemonate ${selectedYear}`, monthEntries, finishedBooks.length)}
            ${buildBarPanelHtml("Top Genres", genreEntries, finishedBooks.length)}
            ${buildDonutPanelHtml("Fiction vs. Non-Fiction", categoryEntries, finishedBooks.length)}
            ${buildDonutPanelHtml("Formate", formatEntries, finishedBooks.length)}
            ${buildDonutPanelHtml("Sprachen", langEntries, finishedBooks.length)}
            ${buildRatingColumnChartHtml(finishedBooks)}
            ${buildDonutPanelHtml("Erscheinungsjahrzehnte", decadeEntries, finishedBooks.length)}
        </div>

    `;
}

if (statsYearFilter) statsYearFilter.addEventListener("change", renderStatisticsPage);
if (statsFanfictionFilter) statsFanfictionFilter.addEventListener("change", renderStatisticsPage);


searchInput.addEventListener("input", renderBooks);
statusFilter.addEventListener("change", renderBooks);
if (seriesFilter) {
    seriesFilter.addEventListener("change", renderBooks);
}
if (fanfictionFilter) {
    fanfictionFilter.addEventListener("change", renderBooks);
}
if (sortOrderFilter) {
    sortOrderFilter.addEventListener("change", renderBooks);
}

if (tbrFanfictionFilter) {
    tbrFanfictionFilter.addEventListener("change", () => {
        if (randomPickContainer) randomPickContainer.hidden = true;
        renderTbrBooks();
    });
}
if (tbrSortOrderFilter) {
    tbrSortOrderFilter.addEventListener("change", renderTbrBooks);
}



function escapeHtml(text) {
    const element = document.createElement("div");
    element.textContent = text;
    return element.innerHTML;
}

// -----------------------------
// App-Start & Migration aus localStorage
// -----------------------------
onAuthStateChanged(auth, async (user) => {
    currentUser = user;

    if (user) {
        authScreen.hidden = true;
        appContainer.hidden = false;
        books = await getAllBooksFromDB();
        renderBooks();
    } else {
        authScreen.hidden = false;
        appContainer.hidden = true;
        books = [];
        renderBooks();
    }
});


if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((err) => {
      console.error("Service Worker Registrierung fehlgeschlagen:", err);
    });
  });
}
