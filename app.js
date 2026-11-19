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
const coverFileInput = document.getElementById("coverFileInput");
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
// Format-Abhängige Felder umschalten
// -----------------------------
function updateFormatFieldsVisibility() {
    if (!formatInput) return;
    const isAudio = formatInput.value === "audiobook";

    if (pagesFieldWrapper) pagesFieldWrapper.hidden = isAudio;
    if (audioDurationWrapper) audioDurationWrapper.hidden = !isAudio;
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
        quotes: document.getElementById("quotesInput").value.trim()
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
    document.getElementById("formatInput").value = book.format || "book";
    document.getElementById("pagesInput").value = book.pages || "";
    document.getElementById("audioHoursInput").value = book.audioHours || "";
    document.getElementById("audioMinutesInput").value = book.audioMinutes || "";
    document.getElementById("languageInput").value = book.language || "";
    document.getElementById("startDateInput").value = book.startDate || "";
    document.getElementById("finishedDateInput").value = book.finishedDate || "";
    document.getElementById("quotesInput").value = book.quotes || "";

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

    const seriesEl = document.getElementById("detailsSeries");
    if (book.series) {
        seriesEl.textContent = book.volume ? `${book.series} · Band ${book.volume}` : book.series;
        seriesEl.hidden = false;
    } else {
        seriesEl.textContent = "";
        seriesEl.hidden = true;
    }

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

        return matchesSearch && matchesStatus && matchesSeries;
    });


    // Wenn eine Serie gewählt ist: Bände automatisch aufsteigend sortieren (Band 1, 2, 3...)
    if (selectedSeries !== "all") {
        filteredBooks.sort((a, b) => {
            const volA = parseFloat(a.volume) || 9999;
            const volB = parseFloat(b.volume) || 9999;
            return volA - volB;
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
    if (!booksView || !tbrView || !seriesView) return;

    tabBooksButton.classList.toggle("active", activeView === "books");
    tabTbrButton.classList.toggle("active", activeView === "tbr");
    tabSeriesButton.classList.toggle("active", activeView === "series");

    booksView.hidden = activeView !== "books";
    tbrView.hidden = activeView !== "tbr";
    seriesView.hidden = activeView !== "series";

    if (activeView === "tbr") renderTbrBooks();
    if (activeView === "series") renderSeriesOverview();
}

if (tabBooksButton && tabTbrButton && tabSeriesButton) {
    tabBooksButton.addEventListener("click", () => switchView("books"));
    tabTbrButton.addEventListener("click", () => switchView("tbr"));
    tabSeriesButton.addEventListener("click", () => switchView("series"));
}

// -----------------------------
// TBR-Ansicht (Nur "Möchte ich lesen" mit Fokus auf Notiz, Kategorie & Genre)
// -----------------------------
function renderTbrBooks() {
    if (!tbrList) return;

    const tbrBooks = books.filter(book => book.status === "wishlist");
    tbrList.innerHTML = "";

    if (tbrBooks.length === 0) {
        tbrList.innerHTML = `
            <div class="empty-series-hint" style="grid-column: 1 / -1;">
                Deine TBR-Liste ist aktuell leer.<br>
                Füge ein neues Buch mit dem Status „Möchte ich lesen“ hinzu, um es hier zu sammeln.
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
                (categoryLabel || genreLabel)
                    ? `<div class="card-badges">
                        ${categoryLabel ? `<span class="meta-pill">${escapeHtml(categoryLabel)}</span>` : ""}
                        ${genreLabel ? `<span class="meta-pill">${escapeHtml(genreLabel)}</span>` : ""}
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
                <li class="series-book-item">
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

        seriesOverviewList.appendChild(card);
    });
}


searchInput.addEventListener("input", renderBooks);
statusFilter.addEventListener("change", renderBooks);
if (seriesFilter) {
    seriesFilter.addEventListener("change", renderBooks);
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
