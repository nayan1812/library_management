const API = "http://127.0.0.1:5000/api";
const CART_KEY = "library_cart";
const CUSTOMER_KEY = "library_customer_details";
const USERNAME_KEY = "library_username";
let booksById = {};
let allBooks = [];

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function login() {
    fetch(API + "/login", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            username: document.getElementById("username").value.trim(),
            password: document.getElementById("password").value.trim()
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.message === "Success") {
            localStorage.setItem("user_id", data.user_id);
            localStorage.setItem(USERNAME_KEY, document.getElementById("username").value.trim());
            localStorage.removeItem(CUSTOMER_KEY);
            window.location.href = "dashboard.html";
        } else {
            alert("Login Failed");
        }
    })
    .catch(err => {
        alert("Error: " + err);
        console.log(err);
    });
}

function getCart() {
    try {
        return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch (err) {
        return [];
    }
}
function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    renderCart();
}
function resetCart() {
    localStorage.setItem(CART_KEY, JSON.stringify([]));
    renderCart();
}
function getCustomerDetails() {
    try {
        return JSON.parse(localStorage.getItem(CUSTOMER_KEY)) || {};
    } catch (err) {
        return {};
    }
}
function saveCustomerDetails(details) {
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(details));
}
function resetCustomerDetails() {
    localStorage.removeItem(CUSTOMER_KEY);
    populateCheckoutForm();
}
function clearPurchaseDetails() {
    const hasAnyValue = [
        document.getElementById("customer-name")?.value,
        document.getElementById("customer-email")?.value,
        document.getElementById("customer-contact")?.value,
        document.getElementById("customer-address")?.value
    ].some(value => String(value || "").trim());

    if (!hasAnyValue) {
        resetCustomerDetails();
        return;
    }

    if (!confirm("Do you want to clear purchase details?")) {
        return;
    }

    resetCustomerDetails();
}
function populateCheckoutForm() {
    const details = getCustomerDetails();
    const nameEl = document.getElementById("customer-name");
    const emailEl = document.getElementById("customer-email");
    const contactEl = document.getElementById("customer-contact");
    const addressEl = document.getElementById("customer-address");

    if (nameEl) {
        nameEl.value = details.name || "";
    }
    if (emailEl) {
        emailEl.value = details.email || "";
    }
    if (contactEl) {
        contactEl.value = details.contact || "";
    }
    if (addressEl) {
        addressEl.value = details.address || "";
    }
}
function getValidatedCustomerDetails() {
    const details = {
        name: document.getElementById("customer-name")?.value.trim() || "",
        email: document.getElementById("customer-email")?.value.trim() || "",
        contact: document.getElementById("customer-contact")?.value.trim() || "",
        address: document.getElementById("customer-address")?.value.trim() || ""
    };

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const contactPattern = /^[0-9+\-\s]{7,15}$/;

    if (!details.name || !details.email || !details.contact || !details.address) {
        alert("Please fill in all purchase details before checkout.");
        return null;
    }

    if (!emailPattern.test(details.email)) {
        alert("Please enter a valid email address.");
        return null;
    }

    if (!contactPattern.test(details.contact)) {
        alert("Please enter a valid contact number.");
        return null;
    }

    saveCustomerDetails(details);
    return details;
}
function updateCartItem(bookId, quantity) {
    const cart = getCart();
    const item = cart.find(entry => entry.book_id === bookId);

    if (!item) {
        return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
        alert("Please enter a valid quantity.");
        renderCart();
        return;
    }

    item.quantity = quantity;
    saveCart(cart);
}
function removeCartItem(bookId) {
    const cart = getCart().filter(item => item.book_id !== bookId);
    saveCart(cart);
}
function clearCart() {
    if (!confirm("Do you want to clear the cart?")) {
        return;
    }
    resetCart();
}
function logout() {
    localStorage.removeItem("user_id");
    localStorage.removeItem(CART_KEY);
    localStorage.removeItem(CUSTOMER_KEY);
    localStorage.removeItem(USERNAME_KEY);
    window.location.href = "index.html";
}
function renderWelcomeText() {
    const welcomeEl = document.getElementById("welcome-text");
    const username = localStorage.getItem(USERNAME_KEY);

    if (!welcomeEl) {
        return;
    }

    welcomeEl.textContent = username
        ? `Welcome, ${username}`
        : "Welcome back";
}
function populateCategoryFilter(books) {
    const categoryEl = document.getElementById("filter-category");

    if (!categoryEl) {
        return;
    }

    const currentValue = categoryEl.value;
    const categories = [...new Set(
        books
            .map(book => String(book.category || "").trim())
            .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));

    categoryEl.innerHTML = '<option value="">All Categories</option>' +
        categories.map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("");

    categoryEl.value = categories.includes(currentValue) ? currentValue : "";
}
function renderBooks(books) {
    const booksEl = document.getElementById("books");

    if (!booksEl) {
        return;
    }

    if (!books.length) {
        booksEl.innerHTML = "<p class='empty-books'>No books found for this filter.</p>";
        return;
    }

    booksEl.innerHTML = books.map(book => BookCard(book)).join("");
}
function applyBookFilters() {
    const searchValue = (document.getElementById("search-books")?.value || "").trim().toLowerCase();
    const categoryValue = (document.getElementById("filter-category")?.value || "").trim().toLowerCase();
    const statusValue = (document.getElementById("filter-status")?.value || "").trim().toLowerCase();

    const filteredBooks = allBooks.filter(book => {
        const title = String(book.title || "").toLowerCase();
        const author = String(book.author || "").toLowerCase();
        const category = String(book.category || "").toLowerCase();
        const status = String(book.status || "").toLowerCase();

        const matchesSearch = !searchValue || title.includes(searchValue) || author.includes(searchValue);
        const matchesCategory = !categoryValue || category === categoryValue;
        const matchesStatus = !statusValue || status === statusValue;

        return matchesSearch && matchesCategory && matchesStatus;
    });

    renderBooks(filteredBooks);
}
function formatHistoryDate(value) {
    if (!value) {
        return "N/A";
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }
    return parsed.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}
function renderOrderHistory(history) {
    const historyEl = document.getElementById("order-history-items");
    const clearBtn = document.getElementById("clear-history-btn");
    if (!historyEl) {
        return;
    }
    if (clearBtn) {
        clearBtn.disabled = !history.length;
    }
    if (!history.length) {
        historyEl.innerHTML = "<p class='empty-history'>No order history available</p>";
        return;
    }
    historyEl.innerHTML = history.map(item => {
        const isRent = item.action === "Rent";
        const quantityText = isRent ? "Qty 1" : `Qty ${item.quantity || 1}`;
        const dateText = formatHistoryDate(item.issue_date);
        const dueText = isRent && item.due_date ? `Due: ${formatHistoryDate(item.due_date)}` : "Completed";
        const priceValue = Number(item.price) || 0;
        const totalText = isRent ? `Rs ${priceValue}` : `Rs ${priceValue * (item.quantity || 1)}`;
        return `
            <div class="history-item">
                <div class="history-main">
                    <span class="history-title">${escapeHtml(item.title || "Book")}</span>
                    <span class="history-meta">${escapeHtml(item.author || "Unknown Author")}</span>
                    <span class="history-meta">${escapeHtml(item.action)} | ${quantityText} | ${dateText}</span>
                </div>
                <div class="history-side">
                    <div>${dueText}</div>
                    <div>${totalText}</div>
                </div>
            </div>
        `;
    }).join("");
}

function loadOrderHistory() {
    const historyEl = document.getElementById("order-history-items");
    const userId = localStorage.getItem("user_id");

    if (!historyEl || !userId) {
        return;
    }

    fetch(`${API}/order_history/${userId}`)
        .then(res => res.json())
        .then(data => {
            if (Array.isArray(data)) {
                renderOrderHistory(data);
                return;
            }

            historyEl.innerHTML = "<p class='empty-history'>Unable to load order history</p>";
        })
        .catch(err => {
            historyEl.innerHTML = "<p class='empty-history'>Unable to load order history</p>";
            console.log(err);
        });
}

function clearOrderHistory() {
    const userId = localStorage.getItem("user_id");
    const clearBtn = document.getElementById("clear-history-btn");

    if (!userId) {
        alert("Please login again.");
        window.location.href = "index.html";
        return;
    }

    if (!confirm("Do you want to clear your order history?")) {
        return;
    }

    if (clearBtn) {
        clearBtn.disabled = true;
    }

    fetch(`${API}/order_history/${userId}`, {
        method: "DELETE"
    })
        .then(res => res.json())
        .then(data => {
            alert(data.message || "Order history cleared.");
            loadOrderHistory();
        })
        .catch(err => {
            alert("Unable to clear order history.");
            console.log(err);
            loadOrderHistory();
        });
}

function renderCart() {
    const cart = getCart();
    const cartItemsEl = document.getElementById("cart-items");
    const summaryEl = document.getElementById("cart-summary");
    const clearCartBtn = document.getElementById("clear-cart-btn");
    const checkoutBtn = document.getElementById("checkout-btn");

    if (!cartItemsEl || !summaryEl) {
        return;
    }

    if (clearCartBtn) {
        clearCartBtn.disabled = cart.length === 0;
    }
    if (checkoutBtn) {
        checkoutBtn.disabled = cart.length === 0;
    }

    if (cart.length === 0) {
        summaryEl.textContent = "0 item(s)";
        cartItemsEl.innerHTML = "<p class='empty-cart'>Cart is empty</p>";
        return;
    }

    let totalItems = 0;
    let totalAmount = 0;
    let list = "";

    cart.forEach(item => {
        const lineTotal = item.price * item.quantity;
        totalItems += item.quantity;
        totalAmount += lineTotal;
        list += `
            <div class="cart-item">
                <div class="cart-item-main">
                    <span class="cart-title">${escapeHtml(item.title)}</span>
                    <span class="cart-price">Rs ${lineTotal}</span>
                </div>
                <div class="cart-item-actions">
                    <label for="cart-qty-${item.book_id}">Qty</label>
                    <input
                        id="cart-qty-${item.book_id}"
                        type="number"
                        min="1"
                        value="${item.quantity}"
                        onchange="updateCartItem(${item.book_id}, Number(this.value))"
                    >
                    <button class="remove-btn" onclick="removeCartItem(${item.book_id})">Remove</button>
                </div>
            </div>
        `;
    });

    summaryEl.textContent = `${totalItems} item(s) | Total: Rs ${totalAmount}`;
    cartItemsEl.innerHTML = list;
}

function addToCart(bookId) {
    const qtyInput = document.getElementById(`qty-${bookId}`);
    const quantity = Number(qtyInput ? qtyInput.value : 1);

    if (!Number.isInteger(quantity) || quantity <= 0) {
        alert("Please enter a valid quantity.");
        return;
    }

    const book = booksById[bookId];
    if (!book) {
        alert("Book not found.");
        return;
    }

    const cart = getCart();
    const existing = cart.find(item => item.book_id === bookId);

    if (existing) {
        existing.quantity += quantity;
    } else {
        cart.push({
            book_id: bookId,
            title: book.title,
            price: Number(book.price) || 0,
            quantity
        });
    }

    saveCart(cart);
    alert("Added to cart.");
}

function getRentDays() {
    const value = Number(prompt("Enter rent duration number (e.g. 7):"));
    if (!Number.isInteger(value) || value <= 0) {
        return null;
    }

    const unit = (prompt("Enter unit: day / week / month", "day") || "").toLowerCase().trim();
    if (!["day", "days", "week", "weeks", "month", "months"].includes(unit)) {
        return null;
    }

    if (unit.startsWith("day")) {
        return value;
    }

    if (unit.startsWith("week")) {
        return value * 7;
    }

    return value * 30;
}

function rentBook(bookId) {
    const rentDays = getRentDays();
    if (!rentDays) {
        alert("Invalid duration. Please try again.");
        return;
    }

    fetch(API + "/action", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            user_id: localStorage.getItem("user_id"),
            book_id: bookId,
            action: "Rent",
            quantity: 1,
            rent_days: rentDays
        })
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message || "Rent processed");
        loadOrderHistory();
    })
    .catch(err => {
        alert("Error: " + err);
        console.log(err);
    });
}

function checkoutCart() {
    const cart = getCart();
    const customerDetails = getValidatedCustomerDetails();

    if (cart.length === 0) {
        alert("Cart is empty.");
        return;
    }

    if (!customerDetails) {
        return;
    }

    const userId = localStorage.getItem("user_id");
    if (!userId) {
        alert("Please login again.");
        window.location.href = "index.html";
        return;
    }

    Promise.all(
        cart.map(item => {
            return fetch(API + "/action", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    user_id: userId,
                    book_id: item.book_id,
                    action: "Buy",
                    quantity: item.quantity
                })
            }).then(res => res.json());
        })
    )
    .then(() => {
        resetCart();
        resetCustomerDetails();
        loadOrderHistory();
        alert(
            `Purchase successful.\n\nName: ${customerDetails.name}\nEmail: ${customerDetails.email}\nContact: ${customerDetails.contact}\nAddress: ${customerDetails.address}\n\nThank you for purchasing with Smart Library.`
        );
    })
    .catch(err => {
        alert("Checkout failed: " + err);
        console.log(err);
    });
}

function loadBooks() {
    fetch(API + "/books")
    .then(res => res.json())
    .then(data => {
        booksById = {};
        allBooks = Array.isArray(data) ? data : [];

        allBooks.forEach(book => {
            booksById[book.id] = book;
        });

        populateCategoryFilter(allBooks);
        applyBookFilters();
        renderCart();
    });
}

function readBook(pdf) {
    if (!pdf) {
        alert("No PDF available");
    } else {
        window.open("pdfs/" + pdf, "_blank");
    }
}

if (window.location.pathname.includes("dashboard.html")) {
    renderWelcomeText();
    loadBooks();
    renderCart();
    loadOrderHistory();
    populateCheckoutForm();
}
