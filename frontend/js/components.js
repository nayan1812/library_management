function BookCard(book) {
    return `
    <div class="card">
        <img src="images/${book.image}" alt="${book.title}" onerror="this.onerror=null;this.src='images/default.jpg'">
        <h3>${book.title}</h3>
        <p>${book.author}</p>
        <p>Rs ${book.price}</p>

        <div class="qty-row">
            <label for="qty-${book.id}">Qty</label>
            <input id="qty-${book.id}" type="number" min="1" value="1">
        </div>

        <div class="actions">
            <button onclick="addToCart(${book.id})">Add To Cart</button>
            <button onclick="rentBook(${book.id})">Rent</button>
            <button onclick="readBook('${book.pdf}')">Read</button>
        </div>
    </div>
    `;
}
