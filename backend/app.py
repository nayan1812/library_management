from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from datetime import date, timedelta

app = Flask(__name__)
CORS(app)


def get_db():
    db = mysql.connector.connect(
        host="localhost",
        user="root",
        password="kavya",
        database="lms"
    )
    cursor = db.cursor(dictionary=True)
    return db, cursor


@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    password = data['password']
    db, cursor = get_db()
    try:
        cursor.execute(
            "INSERT INTO users1 (username,password,role) VALUES (%s,%s,'user')",
            (data['username'], password)
        )
        db.commit()
        return jsonify({"message": "User registered"})
    finally:
        cursor.close()
        db.close()


@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    db, cursor = get_db()
    try:
        cursor.execute(
            "SELECT * FROM users1 WHERE username=%s AND password=%s ORDER BY id DESC LIMIT 1",
            (username, password)
        )
        user = cursor.fetchone()

        if user:
            return jsonify({"message": "Success", "user_id": user['id'], "role": user['role']})

        return jsonify({"message": "Invalid"})
    finally:
        cursor.close()
        db.close()


@app.route('/api/books')
def get_books():
    db, cursor = get_db()
    try:
        cursor.execute("SELECT * FROM books1")
        books = cursor.fetchall()
        return jsonify(books)
    finally:
        cursor.close()
        db.close()


@app.route('/api/add_book', methods=['POST'])
def add_book():
    data = request.json
    db, cursor = get_db()
    try:
        cursor.execute(
            """
            INSERT INTO books1 (title,author,category,image,pdf,price,status)
            VALUES (%s,%s,%s,%s,%s,%s,'Available')
            """,
            (data['title'], data['author'], data['category'], data['image'], data['pdf'], data['price'])
        )
        db.commit()
        return jsonify({"message": "Book added"})
    finally:
        cursor.close()
        db.close()


@app.route('/api/action', methods=['POST'])
def action():
    data = request.json
    db, cursor = get_db()

    user_id = int(data['user_id'])
    book_id = int(data['book_id'])
    action_type = data['action']
    quantity = int(data.get('quantity', 1) or 1)
    quantity = max(quantity, 1)

    rent_days = data.get('rent_days')
    due_date = None

    if action_type == 'Rent':
        if rent_days is None:
            return jsonify({"message": "Rent duration required"}), 400

        rent_days = int(rent_days)
        if rent_days <= 0:
            return jsonify({"message": "Rent duration must be positive"}), 400

        due_date = date.today() + timedelta(days=rent_days)
        quantity = 1
    else:
        rent_days = None

    try:
        try:
            cursor.execute(
                """
                INSERT INTO transactions1 (user_id,book_id,action,issue_date,quantity,rent_days,due_date)
                VALUES (%s,%s,%s,%s,%s,%s,%s)
                """,
                (user_id, book_id, action_type, date.today(), quantity, rent_days, due_date)
            )
        except mysql.connector.Error as err:
            if err.errno in (1054, 1136):
                cursor.execute(
                    """
                    INSERT INTO transactions1 (user_id,book_id,action,issue_date)
                    VALUES (%s,%s,%s,%s)
                    """,
                    (user_id, book_id, action_type, date.today())
                )
            else:
                return jsonify({"message": f"Database error: {err}"}), 500

        status = 'Available'
        if action_type == 'Rent':
            status = 'Rented'
        if action_type == 'Buy':
            status = 'Sold'

        cursor.execute("UPDATE books1 SET status=%s WHERE id=%s", (status, book_id))
        db.commit()

        if action_type == 'Rent':
            return jsonify({"message": f"Book rented for {rent_days} day(s). Due on {due_date}."})

        return jsonify({"message": f"Book purchase recorded. Quantity: {quantity}."})
    finally:
        cursor.close()
        db.close()


@app.route('/api/order_history/<int:user_id>')
def order_history(user_id):
    db, cursor = get_db()
    try:
        cursor.execute(
            """
            SELECT
                t.id,
                t.action,
                t.issue_date,
                COALESCE(t.quantity, 1) AS quantity,
                t.rent_days,
                t.due_date,
                b.title,
                b.author,
                b.price
            FROM transactions1 t
            LEFT JOIN books1 b ON b.id = t.book_id
            WHERE t.user_id = %s
            ORDER BY t.issue_date DESC, t.id DESC
            """,
            (user_id,)
        )
        history = cursor.fetchall()
        return jsonify(history)
    except mysql.connector.Error as err:
        return jsonify({"message": f"Database error: {err}"}), 500
    finally:
        cursor.close()
        db.close()


@app.route('/api/order_history/<int:user_id>', methods=['DELETE'])
def clear_order_history(user_id):
    db, cursor = get_db()
    try:
        cursor.execute("DELETE FROM transactions1 WHERE user_id = %s", (user_id,))
        db.commit()
        return jsonify({"message": "Order history cleared"})
    except mysql.connector.Error as err:
        return jsonify({"message": f"Database error: {err}"}), 500
    finally:
        cursor.close()
        db.close()


if __name__ == "__main__":
    app.run(debug=True)
