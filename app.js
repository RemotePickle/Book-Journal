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
    getDoc,
    getDocs,
    setDoc,
    deleteDoc,
    writeBatch
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

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

// Elemente
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
const categoryFilter = document.getElementById("categoryFilter");
const genreFilter = document.getElementById("genreFilter");
const seriesFilter = document.getElementById("seriesFilter");
const sortOrderFilter = document.getElementById("sortOrderFilter");

const exportButton = document.getElementById("exportButton");
const importInput = document.getElementById("importInput");
const exportCsvButton = document.getElementById("exportCsvButton");
const importCsvInput = document.getElementById("importCsvInput");

const coverUrlInput = document.getElementById("coverUrlInput");
const coverPreview = document.getElementById("coverPreview");
const coverPlaceholder = document.getElementById("coverPlaceholder");

const deleteDialog = document.getElementById("deleteDialog");
const deleteBookTitle = document.getElementById("deleteBookTitle");
const closeDeleteDialogButton = document.getElementById("closeDeleteDialogButton");
const cancelDeleteButton = document.getElementById("cancelDeleteButton");
const confirmDeleteButton = document.getElementById("confirmDeleteButton");

const tabBooksButton = document.getElementById("tabBooksButton");
const tabReadingButton = document.getElementById("tabReadingButton");
const tabTbrButton = document.getElementById("tabTbrButton");
const tabSeriesButton = document.getElementById("tabSeriesButton");
const tabAuthorsButton = document.getElementById("tabAuthorsButton");
const tabStatsButton = document.getElementById("tabStatsButton");
const tabChallengesButton = document.getElementById("tabChallengesButton");

const booksView = document.getElementById("booksView");
const readingView = document.getElementById("readingView");
const tbrView = document.getElementById("tbrView");
const seriesView = document.getElementById("seriesView");
const authorsView = document.getElementById("authorsView");
const statsView = document.getElementById("statsView");
const challengesView = document.getElementById("challengesView");

const readingList = document.getElementById("readingList");
const tbrList = document.getElementById("tbrList");
const seriesOverviewList = document.getElementById("seriesOverviewList");
const tbrSearchInput = document.getElementById("tbrSearchInput");
const tbrCategoryFilter = document.getElementById("tbrCategoryFilter");
const tbrGenreFilter = document.getElementById("tbrGenreFilter");
const tbrSortOrderFilter = document.getElementById("tbrSortOrderFilter");
const randomBookButton = document.getElementById("randomBookButton");
const randomPickContainer = document.getElementById("randomPickContainer");

const detailsDialog = document.getElementById("detailsDialog");
const closeDetailsDialogButton = document.getElementById("closeDetailsDialogButton");
const detailsCloseFooterButton = document.getElementById("detailsCloseFooterButton");
const detailsEditButton = document.getElementById("detailsEditButton");

const formatInput = document.getElementById("formatInput");
const pagesFieldWrapper = document.getElementById("pagesFieldWrapper");
const audioDurationWrapper = document.getElementById("audioDurationWrapper");
const bookStatusInput = document.getElementById("bookStatusInput");
const releaseDateWrapper = document.getElementById("releaseDateWrapper");
const releaseYearWrapper = document.getElementById("releaseYearWrapper");

const statsYearFilter = document.getElementById("statsYearFilter");
const statsMonthFilter = document.getElementById("statsMonthFilter");
const statsDashboard = document.getElementById("statsDashboard");

const authorSearchInput = document.getElementById("authorSearchInput");
const authorsOverviewList = document.getElementById("authorsOverviewList");
const authorTbrDialog = document.getElementById("authorTbrDialog");
const authorTbrDialogTitle = document.getElementById("authorTbrDialogTitle");
const authorTbrBookList = document.getElementById("authorTbrBookList");
const closeAuthorTbrDialogButton = document.getElementById("closeAuthorTbrDialogButton");

// Challenges-Elemente
const challengeYearSelect = document.getElementById("challengeYearSelect");
const challengesTopRow = document.getElementById("challengesTopRow");
const azGrid = document.getElementById("azGrid");
const azProgressBadge = document.getElementById("azProgressBadge");
const club52Block = document.getElementById("club52Block");
const club52FilterSelect = document.getElementById("club52FilterSelect");
const club52ProgressBadge = document.getElementById("club52ProgressBadge");
const club52Grid = document.getElementById("club52Grid");
const badgesProgressBadge = document.getElementById("badgesProgressBadge");
const badgesGrid = document.getElementById("badgesGrid");

const azSuggestionDialog = document.getElementById("azSuggestionDialog");
const azSuggestionTitle = document.getElementById("azSuggestionTitle");
const azSuggestionList = document.getElementById("azSuggestionList");
const closeAzSuggestionButton = document.getElementById("closeAzSuggestionButton");

const challengePickDialog = document.getElementById("challengePickDialog");
const challengePickTitle = document.getElementById("challengePickTitle");
const challengePickSubtitle = document.getElementById("challengePickSubtitle");
const challengePickActionsTop = document.getElementById("challengePickActionsTop");
const challengePickBookList = document.getElementById("challengePickBookList");
const closeChallengePickButton = document.getElementById("closeChallengePickButton");

let challengeData = { goals: {}, club52: {}, badges: {} };
let currentDetailsBookId = null;
let bookIdToDelete = null;
let selectedCover = "";
let editingBookId = null;
let books = [];

if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        loginError.hidden = true;
        try {
            await signInWithEmailAndPassword(auth, loginEmail.value.trim(), loginPassword.value);
            loginForm.reset();
        } catch (error) {
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

function getUserBooksCollection() {
    if (!currentUser) throw new Error("Nicht eingeloggt");
    return collection(db, "users", currentUser.uid, "books");
}

async function getAllBooksFromDB() {
    const snapshot = await getDocs(getUserBooksCollection());
    return snapshot.docs.map(docSnap => docSnap.data());
}

async function saveBookToDB(book) {
    await setDoc(doc(getUserBooksCollection(), book.id), book);
}

async function deleteBookFromDB(id) {
    await deleteDoc(doc(getUserBooksCollection(), id));
}

async function replaceAllBooksInDB(newBooks) {
    const colRef = getUserBooksCollection();
    const existingSnap = await getDocs(colRef);
    const batch = writeBatch(db);
    existingSnap.docs.forEach(docSnap => batch.delete(docSnap.ref));
    newBooks.forEach(book => batch.set(doc(colRef, book.id), book));
    await batch.commit();
}

async function loadChallengeDataFromDB() {
    if (!currentUser) return;
    const ref = doc(db, "users", currentUser.uid, "settings", "challenges");
    const snap = await getDoc(ref);
    if (snap.exists()) {
        const data = snap.data();
        challengeData = {
            goals: data.goals || {},
            club52: data.club52 || {},
            badges: data.badges || {}
        };
    } else {
        challengeData = { goals: {}, club52: {}, badges: {} };
    }
}

async function saveChallengeDataToDB() {
    if (!currentUser) return;
    const ref = doc(db, "users", currentUser.uid, "settings", "challenges");
    await setDoc(ref, challengeData);
}
// ==========================================
// TEIL 2: Cover-Vorschau, Formular & CRUD
// ==========================================

if (coverUrlInput) {
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
}

function showCoverPreview(source) {
    if (!coverPreview || !coverPlaceholder) return;
    coverPreview.src = source;
    coverPreview.hidden = false;
    coverPlaceholder.hidden = true;
}

function hideCoverPreview() {
    if (!coverPreview || !coverPlaceholder) return;
    coverPreview.src = "";
    coverPreview.hidden = true;
    coverPlaceholder.hidden = false;
}

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

    if (!isWishlist) {
        const releaseDateVal = document.getElementById("releaseDateInput")?.value;
        const releaseYearEl = document.getElementById("releaseYearInput");
        if (releaseDateVal && releaseYearEl && !releaseYearEl.value) {
            releaseYearEl.value = releaseDateVal.slice(0, 4);
        }
    }
}

if (bookStatusInput) bookStatusInput.addEventListener("change", updateStatusFieldsVisibility);
if (formatInput) formatInput.addEventListener("change", updateFormatFieldsVisibility);

if (addBookButton) {
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
}

if (closeDialogButton) {
    closeDialogButton.addEventListener("click", () => bookDialog.close());
}

if (bookForm) {
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
            releaseYear: Number(document.getElementById("releaseYearInput").value) || 0
        };

        let bookToSave;
        if (editingBookId === null) {
            bookToSave = { id: crypto.randomUUID(), createdAt: Date.now(), ...bookData };
            books.push(bookToSave);
        } else {
            const bookIndex = books.findIndex(book => book.id === editingBookId);
            if (bookIndex !== -1) {
                bookToSave = { ...books[bookIndex], ...bookData };
                books[bookIndex] = bookToSave;
            }
        }

        if (bookToSave) await saveBookToDB(bookToSave);

        bookForm.reset();
        selectedCover = "";
        editingBookId = null;
        hideCoverPreview();
        bookDialog.close();
        renderBooks();
    });
}

function editBook(id) {
    const book = books.find(b => b.id === id);
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

    updateStatusFieldsVisibility();
    updateFormatFieldsVisibility();

    selectedCover = book.cover || "";
    if (selectedCover) {
        showCoverPreview(selectedCover);
        coverUrlInput.value = selectedCover.startsWith("http") ? selectedCover : "";
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

if (closeDeleteDialogButton) closeDeleteDialogButton.addEventListener("click", closeDeleteModal);
if (cancelDeleteButton) cancelDeleteButton.addEventListener("click", closeDeleteModal);
if (confirmDeleteButton) {
    confirmDeleteButton.addEventListener("click", async () => {
        if (!bookIdToDelete) return;
        await deleteBookFromDB(bookIdToDelete);
        books = books.filter(book => book.id !== bookIdToDelete);
        closeDeleteModal();
        renderBooks();
    });
}
// ==========================================
// TEIL 3: Buchdetails, JSON & CSV Backup
// ==========================================

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

    const metaItems = [];
    if (book.category) {
        metaItems.push({
            label: "Kategorie",
            value: book.category === "fiction" ? "Fiction" : "Non-Fiction"
        });
    }
    if (book.genre) metaItems.push({ label: "Genre", value: book.genre });
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
    if (book.startDate) metaItems.push({ label: "Begonnen am", value: formatGermanDate(book.startDate) });
    if (book.finishedDate) metaItems.push({ label: "Beendet am", value: formatGermanDate(book.finishedDate) });
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

    const notesSection = document.getElementById("detailsNotesSection");
    const notesEl = document.getElementById("detailsNotes");
    if (book.notes) {
        notesEl.textContent = book.notes;
        notesSection.hidden = false;
    } else {
        notesEl.textContent = "";
        notesSection.hidden = true;
    }

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

// JSON Export & Import
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
            if (!Array.isArray(importedBooks)) throw new Error("Ungültiges Dateiformat");

            const validBooks = importedBooks.map(book => ({
                ...book,
                id: book.id || crypto.randomUUID()
            }));

            const replace = confirm(
                `${importedBooks.length} Bücher aus der CSV-Datei gelesen.\n\n` +
                `Klicke auf "OK", um deine Bibliothek damit zu aktualisieren/ersetzen, oder auf "Abbrechen", um abzubrechen.`
            );

            if (replace) {
                books = validBooks;
                await replaceAllBooksInDB(books);
            } else {
                const existingIds = new Set(books.map(b => b.id));
                for (const book of validBooks) {
                    if (existingIds.has(book.id)) book.id = crypto.randomUUID();
                    books.push(book);
                    await saveBookToDB(book);
                }
            }
            renderBooks();
            alert("Backup erfolgreich importiert!");
        } catch (error) {
            alert("Die Backup-Datei konnte nicht gelesen werden.");
        } finally {
            importInput.value = "";
        }
    });
}

// CSV Export & Import
const CSV_COLUMNS = [
    "id", "cover", "title", "author", "status", "rating", "series", "volume",
    "category", "genre", "format", "pages", "audioHours", "audioMinutes",
    "language", "startDate", "finishedDate", "releaseDate", "releaseYear",
    "notes", "quotes"
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
        const dataLines = books.map(book => CSV_COLUMNS.map(col => escapeCsvCell(book[col])).join(";"));
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
if (rows.length < 2) throw new Error("Die CSV-Datei enthält keine Datenzeilen.");
const headers = rows[0].map(h => h.trim());
const existingBooksMap = new Map(books.map(b => [b.id, b]));
const importedBooks = [];
for (let i = 1; i < rows.length; i++) {
const row = rows[i];
const rawObj = {};
headers.forEach((header, idx) => {
rawObj[header] = (row[idx] || "").trim();
});
if (!rawObj.title) continue;
const bookId = rawObj.id || crypto.randomUUID();
const oldBook = existingBooksMap.get(bookId);
importedBooks.push({
id: bookId,
createdAt: oldBook?.createdAt || Date.now(),
cover: rawObj.cover || oldBook?.cover || "",
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
releaseYear: Number(rawObj.releaseYear) || 0
});
}
if (importedBooks.length === 0) {
alert("Es wurden keine gültigen Bücher in der CSV-Datei gefunden.");
return;
}
            const replace = confirm(
                importedBooks.length + ' Bücher aus der CSV-Datei gelesen.\n\n' +
                'Klicke auf "OK", um deine Bibliothek damit zu aktualisieren/ersetzen, oder auf "Abbrechen", um abzubrechen.'
            );

if (replace) {
books = importedBooks;
await replaceAllBooksInDB(books);
renderBooks();
alert("CSV-Daten erfolgreich in die Cloud übernommen!");
}
} catch (error) {
alert("Die CSV-Datei konnte nicht verarbeitet werden: " + error.message);
} finally {
importCsvInput.value = "";
}
});
}




// ==========================================
// TEIL 4: Darstellung, Filter & Tab-Navigation
// ==========================================

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

    seriesFilter.value = uniqueSeries.includes(currentSelection) ? currentSelection : "all";
}

function updateBooksGenreOptions(finishedBooksOnly) {
    if (!genreFilter) return;

    const currentSelection = genreFilter.value;
    const uniqueGenres = [...new Set(
        finishedBooksOnly
            .map(b => (b.genre || "").trim())
            .filter(g => g !== "")
    )].sort((a, b) => a.localeCompare(b, "de"));

    genreFilter.innerHTML = `<option value="all">Alle Genres</option>`;
    uniqueGenres.forEach(genre => {
        const option = document.createElement("option");
        option.value = genre;
        option.textContent = genre;
        genreFilter.appendChild(option);
    });

    genreFilter.value = uniqueGenres.includes(currentSelection) ? currentSelection : "all";
}

function renderBooks() {
    updateSeriesFilterOptions();

    const finishedBooksOnly = books.filter(b => b.status === "finished");
    updateBooksGenreOptions(finishedBooksOnly);

    const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";
    const selectedCategory = categoryFilter ? categoryFilter.value : "all";
    const selectedGenre = genreFilter ? genreFilter.value : "all";
    const selectedSeries = seriesFilter ? seriesFilter.value : "all";

    let filteredBooks = finishedBooksOnly.filter(book => {
        const matchesSearch =
            book.title.toLowerCase().includes(searchTerm) ||
            book.author.toLowerCase().includes(searchTerm) ||
            (book.series && book.series.toLowerCase().includes(searchTerm));

        const matchesCategory =
            selectedCategory === "all" ||
            book.category === selectedCategory;

        const matchesGenre =
            selectedGenre === "all" ||
            (book.genre && book.genre.trim() === selectedGenre);

        const matchesSeries =
            selectedSeries === "all" ||
            (book.series && book.series.trim() === selectedSeries);

        return matchesSearch && matchesCategory && matchesGenre && matchesSeries;
    });

    const selectedSort = sortOrderFilter ? sortOrderFilter.value : "finished-desc";

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
            return (b.createdAt || 0) - (a.createdAt || 0);
        });
    }

    if (bookList) {
        bookList.innerHTML = "";

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

        const langLabels = { de: "Deutsch", en: "Englisch", it: "Italienisch" };

        filteredBooks.forEach(book => {
            const card = document.createElement("article");
            const isDnf = book.rating === "dnf";
            const ratingNum = isDnf ? 0 : (Number(book.rating) || 0);
            const isFiveStars = ratingNum === 5;

            card.className = isFiveStars ? "book-card favorite-card" : "book-card";

            let seriesText = "";
            if (book.series) {
                seriesText = book.series;
                if (book.volume) seriesText += ` · Band ${book.volume}`;
            }

            const formatTagHtml = book.format && formatIcons[book.format] ? formatIcons[book.format] : "";
            const categoryLabel = book.category === "fiction" ? "Fiction" : book.category === "non-fiction" ? "Non-Fiction" : "";
            const genreLabel = (book.genre || "").trim();
            const languageLabel = book.language ? (langLabels[book.language] || book.language) : "";

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
                    ${book.cover
                        ? `<img class="book-cover" src="${escapeHtml(book.cover)}" alt="Cover von ${escapeHtml(book.title)}">`
                        : `<div class="book-cover-placeholder">Kein Cover</div>`}
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
                    ${book.releaseYear ? `<span class="meta-pill">${escapeHtml(String(book.releaseYear))}</span>` : ""}
                </div>


                ${(ratingNum > 0 || isDnf) ? '<div class="rating">' + getStars(book.rating) + '</div>' : ''}
                ${seriesText ? '<div class="series">' + escapeHtml(seriesText) + '</div>' : ''}
                ${book.finishedDate ? '<div class="finished-date">Beendet: ' + formatGermanDate(book.finishedDate) + '</div>' : ''}

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
    }

    updateStats();
    renderReadingBooks();
    renderTbrBooks();
    renderSeriesOverview();
    renderAuthorsOverview();
    renderStatisticsPage();
    renderChallengesPage();
}

function updateStats() {
    const finishedCount = books.filter(b => b.status === "finished").length;
    const readingCount = books.filter(b => b.status === "reading").length;
    const wishlistCount = books.filter(b => b.status === "wishlist").length;

    if (tabBooksButton) tabBooksButton.textContent = 'Gelesene Bücher (' + finishedCount + ')';
    if (tabReadingButton) tabReadingButton.textContent = 'Lese ich (' + readingCount + ')';
    if (tabTbrButton) tabTbrButton.textContent = 'Leseliste (' + wishlistCount + ')';

}

function switchView(activeView) {
    if (!booksView || !readingView || !tbrView || !seriesView || !authorsView || !statsView || !challengesView) return;

    tabBooksButton.classList.toggle("active", activeView === "books");
    tabReadingButton.classList.toggle("active", activeView === "reading");
    tabTbrButton.classList.toggle("active", activeView === "tbr");
    tabSeriesButton.classList.toggle("active", activeView === "series");
    tabAuthorsButton.classList.toggle("active", activeView === "authors");
    tabStatsButton.classList.toggle("active", activeView === "stats");
    tabChallengesButton.classList.toggle("active", activeView === "challenges");

    booksView.hidden = activeView !== "books";
    readingView.hidden = activeView !== "reading";
    tbrView.hidden = activeView !== "tbr";
    seriesView.hidden = activeView !== "series";
    authorsView.hidden = activeView !== "authors";
    statsView.hidden = activeView !== "stats";
    challengesView.hidden = activeView !== "challenges";

    if (activeView === "reading") renderReadingBooks();
    if (activeView === "tbr") renderTbrBooks();
    if (activeView === "series") renderSeriesOverview();
    if (activeView === "authors") renderAuthorsOverview();
    if (activeView === "stats") renderStatisticsPage();
    if (activeView === "challenges") renderChallengesPage();
}

if (tabBooksButton && tabReadingButton && tabTbrButton && tabSeriesButton && tabAuthorsButton && tabStatsButton && tabChallengesButton) {
    tabBooksButton.addEventListener("click", () => switchView("books"));
    tabReadingButton.addEventListener("click", () => switchView("reading"));
    tabTbrButton.addEventListener("click", () => switchView("tbr"));
    tabSeriesButton.addEventListener("click", () => switchView("series"));
    tabAuthorsButton.addEventListener("click", () => switchView("authors"));
    tabStatsButton.addEventListener("click", () => switchView("stats"));
    tabChallengesButton.addEventListener("click", () => switchView("challenges"));
}


// ==========================================
// TEIL 5: Lese ich & Leseliste (TBR)
// ==========================================

function renderReadingBooks() {
    if (!readingList) return;

    const readingBooks = books
        .filter(book => book.status === "reading")
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    readingList.innerHTML = "";

    if (readingBooks.length === 0) {
        readingList.innerHTML = `
            <div class="empty-series-hint" style="grid-column: 1 / -1;">
                Du liest gerade kein Buch aktiv.<br>
                Setze ein Buch auf den Status „Lese ich“, damit es hier erscheint.
            </div>
        `;
        return;
    }

    const langLabels = { de: "Deutsch", en: "Englisch", it: "Italienisch" };

    readingBooks.forEach(book => {
        const card = document.createElement("article");
        card.className = "book-card";

        const categoryLabel = book.category === "fiction" ? "Fiction" : book.category === "non-fiction" ? "Non-Fiction" : "";
        const genreLabel = (book.genre || "").trim();
        const languageLabel = book.language ? (langLabels[book.language] || book.language) : "";
        const seriesText = book.series
            ? (book.volume ? `${book.series} · Band ${book.volume}` : book.series)
            : "";

        card.innerHTML = `
            <div class="cover-wrapper">
                ${book.cover
                    ? `<img class="book-cover" src="${escapeHtml(book.cover)}" alt="Cover von ${escapeHtml(book.title)}">`
                    : `<div class="book-cover-placeholder">Kein Cover</div>`}
            </div>

            <h3>${escapeHtml(book.title)}</h3>
            ${book.author ? `<p class="author">${escapeHtml(book.author)}</p>` : ""}

            <div class="card-badges">
                <span class="status">Lese ich</span>
                ${categoryLabel ? `<span class="meta-pill">${escapeHtml(categoryLabel)}</span>` : ""}
                ${genreLabel ? `<span class="meta-pill">${escapeHtml(genreLabel)}</span>` : ""}
                ${languageLabel ? `<span class="meta-pill">${escapeHtml(languageLabel)}</span>` : ""}
            </div>

            ${seriesText ? `<div class="series">${escapeHtml(seriesText)}</div>` : ""}
            ${book.startDate ? `<div class="finished-date">Begonnen: ${formatGermanDate(book.startDate)}</div>` : ""}
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

        readingList.appendChild(card);
    });
}

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

    tbrGenreFilter.value = uniqueGenres.includes(currentSelection) ? currentSelection : "all";
}

function getFilteredTbrBooks() {
    const allTbrBooks = books.filter(book => book.status === "wishlist");
    updateTbrGenreOptions(allTbrBooks);

    const tbrSearchTerm = tbrSearchInput ? tbrSearchInput.value.trim().toLowerCase() : "";
    const selectedCategory = tbrCategoryFilter ? tbrCategoryFilter.value : "all";
    const selectedGenre = tbrGenreFilter ? tbrGenreFilter.value : "all";
    const selectedTbrSort = tbrSortOrderFilter ? tbrSortOrderFilter.value : "newest";

    const filtered = allTbrBooks.filter(book => {
        const matchesSearch =
            !tbrSearchTerm ||
            book.title.toLowerCase().includes(tbrSearchTerm) ||
            (book.author && book.author.toLowerCase().includes(tbrSearchTerm)) ||
            (book.series && book.series.toLowerCase().includes(tbrSearchTerm));

        const matchesCategory =
            selectedCategory === "all" ||
            book.category === selectedCategory;

        const matchesGenre =
            selectedGenre === "all" ||
            (book.genre && book.genre.trim() === selectedGenre);

        return matchesSearch && matchesCategory && matchesGenre;
    });

    filtered.sort((a, b) => {
        if (selectedTbrSort === "release-asc") {
            if (!a.releaseDate && !b.releaseDate) return 0;
            if (!a.releaseDate) return 1;
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

function isEligibleForRandomPick(book) {
    const seriesName = (book.series || "").trim().toLowerCase();
    if (!seriesName) return true;

    const allBooksInSeries = books.filter(
        b => (b.series || "").trim().toLowerCase() === seriesName
    );
    const unreadInSeries = allBooksInSeries.filter(b => b.status !== "finished");
    if (unreadInSeries.length === 0) return false;

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
if (tbrSortOrderFilter) tbrSortOrderFilter.addEventListener("change", renderTbrBooks);
if (randomBookButton) randomBookButton.addEventListener("click", pickRandomTbrBook);

function renderTbrBooks() {
    if (!tbrList) return;

    const tbrBooks = getFilteredTbrBooks();
    tbrList.innerHTML = "";

    if (tbrBooks.length === 0) {
        tbrList.innerHTML = '<div class="empty-series-hint" style="grid-column: 1 / -1;">Keine passenden Bücher auf deiner Leseliste gefunden.</div>';
        return;
    }

    tbrBooks.forEach(book => {
        const card = document.createElement("article");
        card.className = "book-card";

        const categoryLabel = book.category === "fiction" ? "Fiction" : book.category === "non-fiction" ? "Non-Fiction" : "";
        const genreLabel = (book.genre || "").trim();
        const coverHtml = book.cover
            ? '<img class="book-cover" src="' + escapeHtml(book.cover) + '" alt="Cover">'
            : '<div class="book-cover-placeholder">Kein Cover</div>';

        const badges = [];
        if (categoryLabel) badges.push('<span class="meta-pill">' + escapeHtml(categoryLabel) + '</span>');
        if (genreLabel) badges.push('<span class="meta-pill">' + escapeHtml(genreLabel) + '</span>');
        if (book.releaseDate) badges.push('<span class="meta-pill">Erscheint: ' + formatGermanDate(book.releaseDate) + '</span>');

        card.innerHTML =
            '<div class="cover-wrapper">' + coverHtml + '</div>' +
            '<h3>' + escapeHtml(book.title) + '</h3>' +
            (book.author ? '<p class="author">' + escapeHtml(book.author) + '</p>' : '') +
            (badges.length > 0 ? '<div class="card-badges">' + badges.join('') + '</div>' : '') +
            (book.notes ? '<p class="notes">' + escapeHtml(book.notes) + '</p>' : '') +
            '<div class="card-actions">' +
                '<button class="details-button" data-id="' + book.id + '">Details</button>' +
                '<div class="card-icon-group">' +
                    '<button class="edit-button" data-id="' + book.id + '" aria-label="Buch bearbeiten" title="Bearbeiten">' +
                        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>' +
                    '</button>' +
                    '<button class="delete-button" data-id="' + book.id + '" aria-label="Buch löschen" title="Löschen">' +
                        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>' +
                    '</button>' +
                '</div>' +
            '</div>';

        card.querySelector(".details-button").addEventListener("click", () => showBookDetails(book.id));
        card.querySelector(".edit-button").addEventListener("click", () => editBook(book.id));
        card.querySelector(".delete-button").addEventListener("click", () => deleteBook(book.id));
        tbrList.appendChild(card);
    });
}



if (tbrSearchInput) {
tbrSearchInput.addEventListener("input", () => {
if (randomPickContainer) randomPickContainer.hidden = true;
renderTbrBooks();
});
}



// ==========================================
// TEIL 6: Serien-Übersicht & Autorinnen
// ==========================================

function renderSeriesOverview() {
    if (!seriesOverviewList) return;

    const seriesMap = new Map();
    books.forEach(book => {
        const seriesName = (book.series || "").trim();
        if (!seriesName) return;
        if (!seriesMap.has(seriesName)) seriesMap.set(seriesName, []);
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

    const sortedSeriesNames = [...seriesMap.keys()].sort((a, b) => a.localeCompare(b, "de"));

    sortedSeriesNames.forEach(seriesName => {
        const seriesBooks = seriesMap.get(seriesName);
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

function openAuthorTbrBooks(authorName, tbrBooks) {
    if (tbrBooks.length === 0) return;

    if (tbrBooks.length === 1) {
        showBookDetails(tbrBooks[0].id);
        return;
    }

    if (!authorTbrDialog || !authorTbrBookList) return;

    if (authorTbrDialogTitle) {
        authorTbrDialogTitle.textContent = `${authorName} · Leseliste (${tbrBooks.length})`;
    }

    authorTbrBookList.innerHTML = tbrBooks.map(book => {
        const seriesInfo = book.series
            ? (book.volume ? `${book.series} · Band ${book.volume}` : book.series)
            : "";
        const subParts = [book.genre, seriesInfo, book.releaseDate ? `Erscheint: ${formatGermanDate(book.releaseDate)}` : ""]
            .filter(Boolean)
            .join(" · ");

        return `
            <li class="author-tbr-modal-item" data-id="${book.id}" role="button" tabindex="0">
                <div>
                    <div class="author-tbr-modal-title">${escapeHtml(book.title)}</div>
                    ${subParts ? `<div class="author-tbr-modal-sub">${escapeHtml(subParts)}</div>` : ""}
                </div>
                <span style="color: var(--accent); font-weight: 700;">Details →</span>
            </li>
        `;
    }).join("");

    authorTbrBookList.querySelectorAll(".author-tbr-modal-item").forEach(item => {
        item.addEventListener("click", () => {
            const bookId = item.dataset.id;
            authorTbrDialog.close();
            showBookDetails(bookId);
        });
    });

    authorTbrDialog.showModal();
}

if (closeAuthorTbrDialogButton && authorTbrDialog) {
    closeAuthorTbrDialogButton.addEventListener("click", () => authorTbrDialog.close());
}

function renderAuthorsOverview() {
    if (!authorsOverviewList) return;

    const searchTerm = authorSearchInput ? authorSearchInput.value.trim().toLowerCase() : "";
    const authorMap = new Map();

    books.forEach(book => {
        const name = (book.author || "").trim();
        if (!name) return;

        if (!authorMap.has(name)) {
            authorMap.set(name, { name, finishedBooks: [], tbrBooks: [] });
        }

        const entry = authorMap.get(name);
        if (book.status === "finished") entry.finishedBooks.push(book);
        else if (book.status === "wishlist") entry.tbrBooks.push(book);
    });

    let authors = [...authorMap.values()].filter(a =>
        !searchTerm || a.name.toLowerCase().includes(searchTerm)
    );

    authors.sort((a, b) => {
        if (b.finishedBooks.length !== a.finishedBooks.length) {
            return b.finishedBooks.length - a.finishedBooks.length;
        }
        return a.name.localeCompare(b.name, "de");
    });

    if (authors.length === 0) {
        authorsOverviewList.innerHTML = `
            <div style="padding: 24px; text-align: center; color: var(--secondary-text);">
                Keine passenden Autorinnen gefunden.
            </div>
        `;
        return;
    }

    const headerHtml = `
        <div class="author-row header">
            <span>Autorin</span>
            <span class="author-stat-cell">Gelesen</span>
            <span class="author-stat-cell">Ø Bewertung</span>
            <span class="author-stat-cell">Leseliste</span>
        </div>
    `;

    const rowsHtml = authors.map(author => {
        const finishedCount = author.finishedBooks.length;
        const ratedBooks = author.finishedBooks.filter(b => b.rating !== "dnf" && Number(b.rating) > 0);
        const avgRatingText = ratedBooks.length > 0
            ? `${(ratedBooks.reduce((sum, b) => sum + Number(b.rating), 0) / ratedBooks.length).toFixed(2).replace(".", ",")} ★`
            : "–";

        const tbrCount = author.tbrBooks.length;
        const tbrCellHtml = tbrCount > 0
            ? `<button type="button" class="author-tbr-link" data-author="${escapeHtml(author.name)}" title="Leselisten-Bücher ansehen">${tbrCount}</button>`
            : `<span>0</span>`;

        const finishedCellHtml = finishedCount > 0
            ? `<button type="button" class="author-tbr-link author-finished-link" data-author="${escapeHtml(author.name)}" title="Gelesene Bücher ansehen">${finishedCount}</button>`
            : `<span>0</span>`;

        return `
            <div class="author-row">
                <button type="button" class="author-name-link" data-author="${escapeHtml(author.name)}">${escapeHtml(author.name)}</button>
                <span class="author-stat-cell strong">${finishedCellHtml}</span>
                <span class="author-stat-cell">${avgRatingText}</span>
                <span class="author-stat-cell">${tbrCellHtml}</span>
            </div>
        `;
    }).join("");

    authorsOverviewList.innerHTML = headerHtml + rowsHtml;

    const showAuthorBooks = (authorName) => {
        const authorData = authorMap.get(authorName);
        if (!authorData) return;

        if (authorData.finishedBooks.length > 0) {
            if (categoryFilter) categoryFilter.value = "all";
            if (genreFilter) genreFilter.value = "all";
            if (seriesFilter) seriesFilter.value = "all";
            if (searchInput) searchInput.value = authorName;
            renderBooks();
            switchView("books");
        } else if (authorData.tbrBooks.length > 0) {
            openAuthorTbrBooks(authorName, authorData.tbrBooks);
        }
    };

    authorsOverviewList.querySelectorAll(".author-name-link, .author-finished-link").forEach(btn => {
        btn.addEventListener("click", () => showAuthorBooks(btn.dataset.author));
    });

    authorsOverviewList.querySelectorAll(".author-tbr-link:not(.author-finished-link)").forEach(btn => {
        btn.addEventListener("click", () => {
            const authorData = authorMap.get(btn.dataset.author);
            if (authorData) openAuthorTbrBooks(authorData.name, authorData.tbrBooks);
        });
    });
}

if (authorSearchInput) {
    authorSearchInput.addEventListener("input", renderAuthorsOverview);
}

// ==========================================
// TEIL 7: Challenges – Daten & Auswahl-Dialoge
// ==========================================

const PROMPTS_52_2026 = [
    "1. Ein Buch mit einem Geheimnis",
    "2. Ein Buch, das in einem anderen Land spielt",
    "3. Ein Buch mit einer Zahl im Titel",
    "4. Ein Buch von einer Autorin, die du noch nicht kennst",
    "5. Ein Buch mit einer Farbe im Titel",
    "6. Ein Buch, das vor deiner Geburt erschienen ist",
    "7. Ein Buch mit über 500 Seiten",
    "8. Ein Buch mit unter 250 Seiten",
    "9. Ein Buch, das im Winter spielt",
    "10. Ein Buch, das im Sommer spielt",
    "11. Ein Buch mit einem Tier auf dem Cover oder im Titel",
    "12. Ein Buch, das verfilmt wurde",
    "13. Ein Buch aus einem Genre, das du selten liest",
    "14. Ein Buch mit einem Ein-Wort-Titel",
    "15. Ein Buch, das in der Vergangenheit spielt (Historisch)",
    "16. Ein Buch, das in der Zukunft spielt",
    "17. Ein Buch mit einer starken Freundschaft",
    "18. Ein Buch über Familie",
    "19. Ein Buch mit einem Brief oder Tagebuch in der Geschichte",
    "20. Ein Buch, das auf einer Insel oder am Meer spielt",
    "21. Ein Buch mit einer Karte vorne drin",
    "22. Ein Buch, das du wegen des Covers ausgewählt hast",
    "23. Ein Buch, das dir empfohlen wurde",
    "24. Ein Buch mit einem Ort im Titel",
    "25. Ein Buch aus einer Reihe",
    "26. Ein Einzelband (Standalone)",
    "27. Ein Debütroman",
    "28. Ein Buch mit einem Beruf im Titel oder Fokus",
    "29. Ein Buch, das in einer Großstadt spielt",
    "30. Ein Buch, das auf dem Land oder in den Bergen spielt",
    "31. Ein Buch mit Magie oder übernatürlichen Elementen",
    "32. Ein Thriller oder Krimi",
    "33. Eine Liebesgeschichte",
    "34. Ein Sachbuch / Non-Fiction",
    "35. Ein Buch, das an einem einzigen Tag oder Wochenende spielt",
    "36. Ein Buch mit mehreren Perspektiven",
    "37. Ein Buch, das in einer Buchhandlung oder Bibliothek spielt",
    "38. Ein Buch mit einem Fest oder Feiertag",
    "39. Ein Buch, das länger als 1 Jahr auf deiner Leseliste stand",
    "40. Ein Buch, das 2026 erschienen ist",
    "41. Ein Buch mit einem Wetter-Phänomen im Titel",
    "42. Ein Buch über Kunst, Musik oder Theater",
    "43. Ein Buch mit einer Reise",
    "44. Ein Buch mit einem unzuverlässigen Erzähler",
    "45. Ein Buch, das aus dem Englischen oder einer anderen Sprache übersetzt wurde",
    "46. Ein Buch in einer Fremdsprache lesen",
    "47. Ein Hörbuch",
    "48. Ein Re-Read (nochmal gelesen)",
    "49. Ein Buch mit einem Namen im Titel",
    "50. Ein Buch mit Blumen oder Pflanzen auf dem Cover",
    "51. Ein Buch, das dich zum Lachen oder Weinen bringt",
    "52. Dein persönliches Highlight-Buch des Jahres"
];

const MANUAL_BADGES = [
    { id: "series-finisher", icon: "📚", title: "Serien-Beenderin", desc: "Eine komplette Reihe abgeschlossen" },
    { id: "brick-slayer", icon: "🧱", title: "Ziegelstein-Bezwingerin", desc: "Ein Buch mit 600+ Seiten beendet" },
    { id: "polyglot", icon: "🌍", title: "Weltreisende", desc: "Ein Buch in einer Fremdsprache gelesen" },
    { id: "allrounder", icon: "🎧", title: "Allrounderin", desc: "Buch, eBook & Hörbuch genutzt" },
    { id: "five-star-gem", icon: "⭐", title: "5-Sterne-Juwel", desc: "Ein absolutes Jahreshighlight gefunden" },
    { id: "out-of-comfort", icon: "🧭", title: "Komfortzone verlassen", desc: "Ein völlig neues Genre ausprobiert" }
];

function getTitleChallengeLetter(title) {
    if (!title) return null;
    const cleaned = title
        .trim()
        .replace(/^(der|die|das|ein|eine|einer|eines|einem|einen|the|a|an|il|lo|la|gli|le|un|una)\s+/i, "")
        .replace(/^[^a-zA-ZäöüÄÖÜß]+/, "");

    if (!cleaned) return null;
    let first = cleaned.charAt(0).toUpperCase();
    if (first === "Ä") first = "A";
    if (first === "Ö") first = "O";
    if (first === "Ü") first = "U";
    return /^[A-Z]$/.test(first) ? first : null;
}

function getBookRatingScore(book) {
    if (book.rating === "dnf") return -1;
    return Number(book.rating) || 0;
}

function updateChallengeYearOptions() {
    if (!challengeYearSelect) return;

    const currentYear = String(new Date().getFullYear());
    const currentSelection = challengeYearSelect.value;

    const yearsSet = new Set([currentYear]);
    books.forEach(b => {
        if (b.status === "finished" && b.finishedDate && b.finishedDate.length >= 4) {
            yearsSet.add(b.finishedDate.slice(0, 4));
        }
    });

    const sortedYears = [...yearsSet].sort((a, b) => b.localeCompare(a));

    challengeYearSelect.innerHTML = "";
    sortedYears.forEach(year => {
        const option = document.createElement("option");
        option.value = year;
        option.textContent = year === currentYear ? `Jahr ${year} (Aktuell)` : `Jahr ${year}`;
        challengeYearSelect.appendChild(option);
    });

    challengeYearSelect.value = sortedYears.includes(currentSelection) ? currentSelection : currentYear;
}

function openAzSuggestions(letter) {
    if (!azSuggestionDialog || !azSuggestionList) return;

    const matchingTbr = books
        .filter(b => b.status === "wishlist")
        .filter(isEligibleForRandomPick)
        .filter(b => getTitleChallengeLetter(b.title) === letter)
        .sort((a, b) => (a.title || "").localeCompare(b.title || "", "de"));

    if (azSuggestionTitle) {
        azSuggestionTitle.textContent = `Passende Leselisten-Bücher für „${letter}“ (${matchingTbr.length})`;
    }

    if (matchingTbr.length === 0) {
        azSuggestionList.innerHTML = `
            <li style="padding: 14px; color: var(--secondary-text); text-align: center;">
                Aktuell steht kein passendes Buch mit „${escapeHtml(letter)}“ für die Zufallsziehung auf deiner Leseliste bereit.
            </li>
        `;
    } else {
        azSuggestionList.innerHTML = matchingTbr.map(book => {
            const seriesInfo = book.series
                ? (book.volume ? `${book.series} · Band ${book.volume}` : book.series)
                : "";
            const sub = [book.author, book.genre, seriesInfo].filter(Boolean).join(" · ");

            return `
                <li class="author-tbr-modal-item" data-id="${book.id}" role="button" tabindex="0">
                    <div>
                        <div class="author-tbr-modal-title">${escapeHtml(book.title)}</div>
                        ${sub ? `<div class="author-tbr-modal-sub">${escapeHtml(sub)}</div>` : ""}
                    </div>
                    <span style="color: var(--accent); font-weight: 700;">Details →</span>
                </li>
            `;
        }).join("");

        azSuggestionList.querySelectorAll(".author-tbr-modal-item").forEach(item => {
            item.addEventListener("click", () => {
                const id = item.dataset.id;
                azSuggestionDialog.close();
                showBookDetails(id);
            });
        });
    }

    azSuggestionDialog.showModal();
}

if (closeAzSuggestionButton && azSuggestionDialog) {
    closeAzSuggestionButton.addEventListener("click", () => azSuggestionDialog.close());
}

function openChallengeBookPicker({ title, subtitle, booksInYear, currentBookId, onSelect }) {
    if (!challengePickDialog || !challengePickBookList) return;

    if (challengePickTitle) challengePickTitle.textContent = title;
    if (challengePickSubtitle) challengePickSubtitle.textContent = subtitle || "";

    if (challengePickActionsTop) {
        if (currentBookId) {
            challengePickActionsTop.innerHTML = `
                <button type="button" id="removeChallengePickBtn" class="secondary-button" style="color: #a44; border-color: #e6c2c2;">
                    Zuordnung entfernen
                </button>
            `;
            document.getElementById("removeChallengePickBtn").addEventListener("click", async () => {
                challengePickDialog.close();
                await onSelect("");
            });
        } else {
            challengePickActionsTop.innerHTML = "";
        }
    }

    const sortedBooks = [...booksInYear].sort((a, b) =>
        (a.title || "").localeCompare(b.title || "", "de")
    );

    if (sortedBooks.length === 0) {
        challengePickBookList.innerHTML = `
            <li style="padding: 14px; color: var(--secondary-text); text-align: center;">
                In diesem Jahr wurden noch keine gelesenen Bücher erfasst.
            </li>
        `;
    } else {
        challengePickBookList.innerHTML = sortedBooks.map(book => {
            const isSelected = book.id === currentBookId;
            return `
                <li class="author-tbr-modal-item" data-id="${book.id}" role="button" tabindex="0" style="${isSelected ? "border-color: var(--accent); background: var(--accent-light);" : ""}">
                    <div>
                        <div class="author-tbr-modal-title">${escapeHtml(book.title)}</div>
                        ${book.author ? `<div class="author-tbr-modal-sub">${escapeHtml(book.author)}</div>` : ""}
                    </div>
                    <span style="color: var(--accent); font-weight: 700;">${isSelected ? "✓ Aktiv" : "Wählen"}</span>
                </li>
            `;
        }).join("");

        challengePickBookList.querySelectorAll(".author-tbr-modal-item").forEach(item => {
            item.addEventListener("click", async () => {
                const chosenId = item.dataset.id;
                challengePickDialog.close();
                await onSelect(chosenId);
            });
        });
    }

    challengePickDialog.showModal();
}

if (closeChallengePickButton && challengePickDialog) {
    closeChallengePickButton.addEventListener("click", () => challengePickDialog.close());
}

// ==========================================
// TEIL 8: Challenges rendern
// ==========================================

function renderChallengesPage() {
    if (!challengesView) return;

    updateChallengeYearOptions();

    const currentYear = String(new Date().getFullYear());
    const selectedYear = challengeYearSelect ? challengeYearSelect.value : currentYear;
    const isCurrentYear = selectedYear === currentYear;

    const finishedInYear = books.filter(
        b => b.status === "finished" && b.finishedDate && b.finishedDate.startsWith(selectedYear)
    );

    // 1. OBERE REIHE: Jahresziel & SuB-Abbau-Duell
    const goalTarget = Number(challengeData.goals[selectedYear]) || 0;
    const finishedCount = finishedInYear.length;
    const goalPercent = goalTarget > 0 ? Math.min(Math.round((finishedCount / goalTarget) * 100), 100) : 0;

    let paceBadgeHtml = "";
    if (goalTarget > 0) {
        if (isCurrentYear) {
            const now = new Date();
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            const endOfYear = new Date(now.getFullYear(), 11, 31);
            const dayOfYear = Math.max(1, Math.floor((now - startOfYear) / (1000 * 60 * 60 * 24)) + 1);
            const totalDays = Math.floor((endOfYear - startOfYear) / (1000 * 60 * 60 * 24)) + 1;
            const expectedCount = (goalTarget * dayOfYear) / totalDays;
            const diff = Math.round(finishedCount - expectedCount);

            if (diff >= 1) {
                paceBadgeHtml = `<span class="pace-badge ahead">🚀 ${diff} ${diff === 1 ? "Buch" : "Bücher"} voraus</span>`;
            } else if (diff <= -1) {
                const behind = Math.abs(diff);
                paceBadgeHtml = `<span class="pace-badge behind">⏳ ${behind} ${behind === 1 ? "Buch" : "Bücher"} hinter dem Plan</span>`;
            } else {
                paceBadgeHtml = `<span class="pace-badge on-track">✅ Genau im Zeitplan</span>`;
            }
        } else {
            paceBadgeHtml = finishedCount >= goalTarget
                ? `<span class="pace-badge ahead">🏆 Ziel erreicht (${Math.round((finishedCount / goalTarget) * 100)} %)</span>`
                : `<span class="pace-badge on-track">${Math.round((finishedCount / goalTarget) * 100)} % erreicht</span>`;
        }
    }

    const addedInYearCount = books.filter(b => {
        if (!b.createdAt) return false;
        return String(new Date(b.createdAt).getFullYear()) === selectedYear;
    }).length;

    const subBalance = finishedCount - addedInYearCount;
    let subBadgeHtml = `<span class="pace-badge on-track">⚖️ Ausgeglichen (0)</span>`;
    if (subBalance > 0) subBadgeHtml = `<span class="pace-badge ahead">📉 TBR um ${subBalance} geschrumpft!</span>`;
    if (subBalance < 0) subBadgeHtml = `<span class="pace-badge behind">📈 TBR um ${Math.abs(subBalance)} gewachsen</span>`;


    if (challengesTopRow) {
        challengesTopRow.innerHTML = `
            <div class="challenge-section-card">
                <div class="challenge-section-header">
                    <div>
                        <h3>🎯 Jahres-Leseziel ${selectedYear}</h3>
                        <p class="challenge-sub">${goalTarget > 0 ? `${finishedCount} von ${goalTarget} Büchern (${goalPercent} %)` : `${finishedCount} Bücher gelesen · Noch kein Ziel gesetzt`}</p>
                    </div>
                    ${paceBadgeHtml}
                </div>
                ${goalTarget > 0 ? `<div class="challenge-progress-track"><div class="challenge-progress-fill" style="width: ${goalPercent}%;"></div></div>` : ""}
                <div class="goal-input-row">
                    <input type="number" id="yearlyGoalInput" min="1" max="1000" value="${goalTarget || ""}" placeholder="Ziel (z. B. 50)">
                    <button type="button" id="saveYearlyGoalButton" class="secondary-button">Ziel speichern</button>
                </div>
            </div>

            <div class="challenge-section-card">
                <div class="challenge-section-header">
                    <div>
                        <h3>TBR-Abbau ${selectedYear}</h3>
                        <p class="challenge-sub">Gelesene Bücher vs. Neuzugänge in diesem Jahr</p>
                    </div>
                    ${subBadgeHtml}
                </div>
                <div class="sub-duel-boxes">
                    <div class="sub-duel-stat"><span class="sub-duel-num">${finishedCount}</span><span class="sub-duel-lbl">Gelesen</span></div>
                    <span class="sub-duel-vs">vs.</span>
                    <div class="sub-duel-stat"><span class="sub-duel-num">${addedInYearCount}</span><span class="sub-duel-lbl">Neu hinzugefügt</span></div>
                </div>
            </div>
        `;

        const saveGoalBtn = document.getElementById("saveYearlyGoalButton");
        const goalInput = document.getElementById("yearlyGoalInput");
        if (saveGoalBtn && goalInput) {
            saveGoalBtn.addEventListener("click", async () => {
                challengeData.goals[selectedYear] = Number(goalInput.value) || 0;
                await saveChallengeDataToDB();
                renderChallengesPage();
            });
        }
    }

    // 2. A–Z CHALLENGE
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const bestBookByLetter = new Map();

    finishedInYear.forEach(book => {
        const letter = getTitleChallengeLetter(book.title);
        if (!letter) return;
        const existing = bestBookByLetter.get(letter);
        if (!existing || getBookRatingScore(book) > getBookRatingScore(existing)) {
            bestBookByLetter.set(letter, book);
        }
    });

    const azCount = bestBookByLetter.size;
    const azPercent = Math.round((azCount / 26) * 100);
    if (azProgressBadge) azProgressBadge.textContent = `${azCount} / 26 (${azPercent} %)`;

    if (azGrid) {
        azGrid.innerHTML = alphabet.map(letter => {
            const book = bestBookByLetter.get(letter);
            if (book) {
                return `
                    <button type="button" class="az-tile filled" data-book-id="${book.id}" title="${letter}: ${escapeHtml(book.title)}">
                        ${book.cover
                            ? `<img src="${escapeHtml(book.cover)}" alt="${escapeHtml(book.title)}">`
                            : `<div class="az-cover-fallback"><span>${letter}</span><small>${escapeHtml(book.title)}</small></div>`}
                    </button>
                `;
            }
            return `
                <button type="button" class="az-tile empty ${isCurrentYear ? "clickable" : ""}" data-letter="${letter}">
                    <span class="az-letter">${letter}</span>
                </button>
            `;
        }).join("");

        azGrid.querySelectorAll(".az-tile.filled").forEach(tile => {
            tile.addEventListener("click", () => showBookDetails(tile.dataset.bookId));
        });

        if (isCurrentYear) {
            azGrid.querySelectorAll(".az-tile.empty.clickable").forEach(tile => {
                tile.addEventListener("click", () => openAzSuggestions(tile.dataset.letter));
            });
        }
    }

    // 3. THE 52 BOOK CLUB (ab 2026)
    if (club52Block) {
        if (Number(selectedYear) < 2026) {
            club52Block.hidden = true;
        } else {
            club52Block.hidden = false;
            const assignments = challengeData.club52[selectedYear] || {};
            const fulfilledCount = PROMPTS_52_2026.filter((_, idx) => Boolean(assignments[String(idx + 1)])).length;
            const clubPercent = Math.round((fulfilledCount / 52) * 100);
            if (club52ProgressBadge) club52ProgressBadge.textContent = `${fulfilledCount} / 52 (${clubPercent} %)`;

            const filterVal = club52FilterSelect ? club52FilterSelect.value : "all";
            if (club52Grid) {
                club52Grid.innerHTML = PROMPTS_52_2026.map((promptText, idx) => {
                    const promptNum = String(idx + 1);
                    const assignedBookId = assignments[promptNum] || "";
                    const assignedBook = assignedBookId ? books.find(b => b.id === assignedBookId) : null;
                    const isDone = Boolean(assignedBook);

                    if (filterVal === "done" && !isDone) return "";
                    if (filterVal === "open" && isDone) return "";

                    const visualHtml = assignedBook
                        ? (assignedBook.cover
                            ? '<img class="prompt-cover" src="' + escapeHtml(assignedBook.cover) + '" alt="' + escapeHtml(assignedBook.title) + '">'
                            : '<div class="prompt-cover-placeholder filled">' + escapeHtml(assignedBook.title) + '</div>')
                        : '<div class="prompt-cover-placeholder">+ Buch wählen</div>';

                    return (
                        '<button type="button" class="prompt-card ' + (isDone ? 'done' : '') + '" data-prompt="' + promptNum + '">' +
                            '<div class="prompt-card-title">' + escapeHtml(promptText) + '</div>' +
                            '<div class="prompt-card-visual">' + visualHtml + '</div>' +
                        '</button>'
                    );
                }).join("");


                club52Grid.querySelectorAll(".prompt-card").forEach(card => {
                    card.addEventListener("click", () => {
                        const promptNum = card.dataset.prompt;
                        const promptLabel = PROMPTS_52_2026[Number(promptNum) - 1];
                        const currentId = challengeData.club52[selectedYear]?.[promptNum] || "";

                        openChallengeBookPicker({
                            title: promptLabel,
                            subtitle: `Gelesenes Buch aus ${selectedYear} zuordnen`,
                            booksInYear: finishedInYear,
                            currentBookId: currentId,


                            onSelect: async (chosenBookId) => {
                                if (!challengeData.club52[selectedYear]) challengeData.club52[selectedYear] = {};
                                if (chosenBookId) challengeData.club52[selectedYear][promptNum] = chosenBookId;
                                else delete challengeData.club52[selectedYear][promptNum];
                                await saveChallengeDataToDB();
                                renderChallengesPage();
                            }
                        });
                    });
                });
            }
        }
}
    // 4. MANUELLE LESE-ABZEICHEN
    const badgeAssignments = challengeData.badges[selectedYear] || {};
    const badgesUnlocked = MANUAL_BADGES.filter(b => Boolean(badgeAssignments[b.id])).length;
    if (badgesProgressBadge) badgesProgressBadge.textContent = badgesUnlocked + ' / ' + MANUAL_BADGES.length;

    if (badgesGrid) {
        badgesGrid.innerHTML = MANUAL_BADGES.map(badge => {
            const assignedBookId = badgeAssignments[badge.id] || "";
            const assignedBook = assignedBookId ? books.find(b => b.id === assignedBookId) : null;
            const tagText = assignedBook ? '✓ ' + escapeHtml(assignedBook.title) : '+ Buch zuordnen';

            return (
                '<button type="button" class="badge-card ' + (assignedBook ? 'unlocked' : '') + '" data-badge-id="' + badge.id + '">' +
                    '<div class="badge-top">' +
                        '<span class="badge-icon">' + badge.icon + '</span>' +
                        '<div>' +
                            '<div class="badge-title">' + escapeHtml(badge.title) + '</div>' +
                            '<div class="badge-desc">' + escapeHtml(badge.desc) + '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="badge-book-tag">' + tagText + '</div>' +
                '</button>'
            );
        }).join("");

        badgesGrid.querySelectorAll(".badge-card").forEach(card => {
            card.addEventListener("click", () => {
                const badgeId = card.dataset.badgeId;
                const badgeMeta = MANUAL_BADGES.find(b => b.id === badgeId);
                const currentId = challengeData.badges[selectedYear]?.[badgeId] || "";

                openChallengeBookPicker({
                    title: badgeMeta.icon + ' ' + badgeMeta.title,
                    subtitle: badgeMeta.desc,
                    booksInYear: finishedInYear,
                    currentBookId: currentId,
                    onSelect: async (chosenBookId) => {
                        if (!challengeData.badges[selectedYear]) challengeData.badges[selectedYear] = {};
                        if (chosenBookId) challengeData.badges[selectedYear][badgeId] = chosenBookId;
                        else delete challengeData.badges[selectedYear][badgeId];
                        await saveChallengeDataToDB();
                        renderChallengesPage();
                    }
                });
            });
        });
    }
}

if (challengeYearSelect) challengeYearSelect.addEventListener("change", renderChallengesPage);
if (club52FilterSelect) club52FilterSelect.addEventListener("change", renderChallengesPage);

// ==========================================
// TEIL 9: Statistiken, Filter-Listener & Start
// ==========================================

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

    statsYearFilter.value = years.includes(currentSelection) ? currentSelection : "all";
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
    "#4f6b5a",
    "#d49d27",
    "#7c9a87",
    "#c97b53",
    "#6b8299",
    "#9c8265",
    "#b5a692"
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
                if (counts.has(key)) counts.set(key, counts.get(key) + 1);
            } else {
                unratedCount++;
            }
        }
    });

    const maxCount = Math.max(...counts.values(), 1);

    const columnsHtml = slots.map(slot => {
        const count = counts.get(slot.key) || 0;
        const heightPercent = count > 0 ? Math.max(Math.round((count / maxCount) * 100), 8) : 2;
        const barClasses = ["col-bar", slot.isDnf ? "dnf" : "", count === 0 ? "empty" : ""].filter(Boolean).join(" ");

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

function buildDecadeColumnChartHtml(finishedBooks) {
    const validYears = finishedBooks
        .map(b => Number(b.releaseYear))
        .filter(y => y > 0);

    const noYearCount = finishedBooks.length - validYears.length;

    if (validYears.length === 0) {
        return `
            <div class="stats-panel">
                <h3>Erscheinungsjahrzehnte</h3>
                <p style="margin: 0; font-size: 13px; color: var(--secondary-text);">Noch keine Erscheinungsjahre hinterlegt.</p>
            </div>
        `;
    }

    const minDecade = Math.floor(Math.min(...validYears) / 10) * 10;
    const maxDecade = Math.floor(Math.max(...validYears) / 10) * 10;

    const slots = [];
    for (let d = minDecade; d <= maxDecade; d += 10) {
        slots.push({ decade: d, label: `${String(d).slice(-2)}er`, fullLabel: `${d}er`, count: 0 });
    }

    validYears.forEach(y => {
        const d = Math.floor(y / 10) * 10;
        const slot = slots.find(s => s.decade === d);
        if (slot) slot.count++;
    });

    if (noYearCount > 0) {
        slots.push({ decade: null, label: "o. A.", fullLabel: "Ohne Angabe", count: noYearCount });
    }

    const maxCount = Math.max(...slots.map(s => s.count), 1);

    const columnsHtml = slots.map(slot => {
        const heightPercent = slot.count > 0 ? Math.max(Math.round((slot.count / maxCount) * 100), 8) : 2;
        const barClasses = ["col-bar", slot.count === 0 ? "empty" : ""].filter(Boolean).join(" ");

        return `
            <div class="col-item" title="${slot.fullLabel}: ${slot.count} Bücher">
                <div class="col-bar-area">
                    <span class="col-count ${slot.count === 0 ? "zero" : ""}">${slot.count}</span>
                    <div class="${barClasses}" style="height: ${heightPercent}%"></div>
                </div>
                <span class="col-label">${escapeHtml(slot.label)}</span>
            </div>
        `;
    }).join("");

    return `
        <div class="stats-panel">
            <h3>Erscheinungsjahrzehnte</h3>
            <div class="decade-column-chart" style="--cols: ${slots.length};">${columnsHtml}</div>
        </div>
    `;
}

function renderStatisticsPage() {
    if (!statsDashboard) return;

    updateStatsYearOptions();

    const selectedYear = statsYearFilter ? statsYearFilter.value : "all";
    const selectedMonth = statsMonthFilter ? statsMonthFilter.value : "all";

    const finishedBooks = books.filter(book => {
        if (book.status !== "finished") return false;
        if (selectedYear !== "all" && (!book.finishedDate || !book.finishedDate.startsWith(selectedYear))) return false;
        if (selectedMonth !== "all" && (!book.finishedDate || book.finishedDate.slice(5, 7) !== selectedMonth)) return false;
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
const monthNames = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const fullMonthNames = {
"01": "Januar", "02": "Februar", "03": "März", "04": "April",
"05": "Mai", "06": "Juni", "07": "Juli", "08": "August",
"09": "September", "10": "Oktober", "11": "November", "12": "Dezember"
};




    let timeChartTitle = selectedYear === "all" ? "Bücher nach Monat (Gesamt)" : "Lesemonate " + selectedYear;
    let timeChartEntries = [];

    if (selectedMonth !== "all") {
        const mLabel = fullMonthNames[selectedMonth] || selectedMonth;
        timeChartTitle = selectedYear === "all"
            ? "Wochentage (" + mLabel + ", alle Jahre)"
            : "Wochentage (" + mLabel + " " + selectedYear + ")";
        const weekdayNames = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
        const weekdayCounts = new Array(7).fill(0);
        finishedBooks.forEach(b => {
            if (b.finishedDate) {
                const d = new Date(b.finishedDate);
                if (!isNaN(d)) {
                    const jsDay = d.getDay();
                    const monIdx = jsDay === 0 ? 6 : jsDay - 1;
                    weekdayCounts[monIdx]++;
                }
            }
        });
        timeChartEntries = weekdayNames.map((label, idx) => ({
            label,
            count: weekdayCounts[idx],
            customLabel: String(weekdayCounts[idx])
        }));
    } else {
        const monthCounts = new Array(12).fill(0);
        finishedBooks.forEach(b => {
            if (b.finishedDate && b.finishedDate.length >= 7) {
                const mIdx = parseInt(b.finishedDate.slice(5, 7), 10) - 1;
                if (mIdx >= 0 && mIdx < 12) monthCounts[mIdx]++;
            }
        });
        timeChartEntries = monthNames
            .map((label, idx) => ({ label, count: monthCounts[idx], customLabel: String(monthCounts[idx]) }))
            .filter(m => selectedYear !== "all" || m.count > 0);
    }

    const genreEntries = countBy(finishedBooks, b => (b.genre || "").trim()).slice(0, 8);
    const categoryEntries = countBy(finishedBooks, b =>
        b.category === "fiction" ? "Fiction" : b.category === "non-fiction" ? "Non-Fiction" : "Keine Angabe"
    );
    const formatNames = { book: "Buch", ebook: "eBook", audiobook: "Hörbuch" };
    const formatEntries = countBy(finishedBooks, b => formatNames[b.format] || "Keine Angabe");
    const langNames = { de: "Deutsch", en: "Englisch", it: "Italienisch" };
    const langEntries = countBy(finishedBooks, b => langNames[b.language] || "Keine Angabe");

    const decadeEntries = countBy(finishedBooks, b => {
        const y = Number(b.releaseYear);
        if (!y) return "Keine Angabe";
        if (y < 1980) return "Vor 1980";
        const decade = Math.floor(y / 10) * 10;
        return decade + "er";
    });

    const dnfSuffix = dnfCount > 0 ? " · " + dnfCount + " DNF" : "";

    statsDashboard.innerHTML =
        '<div class="stats-kpi-grid">' +
            '<div class="stats-kpi-card">' +
                '<span class="stats-kpi-value">' + completedCount + '</span>' +
                '<span class="stats-kpi-label">Gelesene Bücher</span>' +
                '<span class="stats-kpi-sub">Ø ' + avgRating + ' ★' + dnfSuffix + '</span>' +
            '</div>' +
            '<div class="stats-kpi-card">' +
                '<span class="stats-kpi-value">' + totalPages.toLocaleString("de-DE") + '</span>' +
                '<span class="stats-kpi-label">Gelesene Seiten</span>' +
                '<span class="stats-kpi-sub">Ø ' + avgPages + ' Seiten / Buch</span>' +
            '</div>' +
            '<div class="stats-kpi-card">' +
                '<span class="stats-kpi-value">' + audioHoursTotal + ':' + audioMinutesRest + '</span>' +
                '<span class="stats-kpi-label">Hörbuch-Stunden</span>' +
                '<span class="stats-kpi-sub">' + audioBooks.length + ' Hörbücher</span>' +
            '</div>' +
            '<div class="stats-kpi-card">' +
                '<span class="stats-kpi-value">' + avgDays + '</span>' +
                '<span class="stats-kpi-label">Ø Tage pro Buch</span>' +
                '<span class="stats-kpi-sub">Basierend auf ' + durationsInDays.length + ' Büchern</span>' +
            '</div>' +
        '</div>' +
        '<div class="stats-charts-grid">' +
            buildBarPanelHtml(timeChartTitle, timeChartEntries, finishedBooks.length) +
            buildBarPanelHtml("Top Genres", genreEntries, finishedBooks.length) +
            buildDonutPanelHtml("Fiction vs. Non-Fiction", categoryEntries, finishedBooks.length) +
            buildDonutPanelHtml("Formate", formatEntries, finishedBooks.length) +
            buildDonutPanelHtml("Sprachen", langEntries, finishedBooks.length) +
            buildRatingColumnChartHtml(finishedBooks) +
            buildDecadeColumnChartHtml(finishedBooks) +
        '</div>';
}







if (statsYearFilter) statsYearFilter.addEventListener("change", renderStatisticsPage);
if (statsMonthFilter) statsMonthFilter.addEventListener("change", renderStatisticsPage);
if (searchInput) searchInput.addEventListener("input", renderBooks);
if (categoryFilter) categoryFilter.addEventListener("change", renderBooks);
if (genreFilter) genreFilter.addEventListener("change", renderBooks);
if (seriesFilter) seriesFilter.addEventListener("change", renderBooks);
if (sortOrderFilter) sortOrderFilter.addEventListener("change", renderBooks);
function escapeHtml(text) {
const element = document.createElement("div");
element.textContent = text;
return element.innerHTML;
}
onAuthStateChanged(auth, async (user) => {
    currentUser = user;

    if (user) {
        authScreen.hidden = true;
        appContainer.hidden = false;

        try {
            await loadChallengeDataFromDB();
        } catch (err) {
            console.warn("Challenge-Daten konnten noch nicht geladen werden:", err);
        }

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