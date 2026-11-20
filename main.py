
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.staticfiles import StaticFiles
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel, Field
from pwdlib import PasswordHash
from pathlib import Path
from typing import Iterator
import sqlite3
import jwt
import os


# ==========================================
# Application Configuration
# ==========================================

app = FastAPI(title="Management System API")

BASE_DIR = Path(__file__).resolve().parent

STATIC_DIR = BASE_DIR / "static"
DB_PATH = BASE_DIR / "database.db"

# Ensure the static directory exists
STATIC_DIR.mkdir(parents=True, exist_ok=True)

app.mount(
    "/static",
    StaticFiles(directory=STATIC_DIR),
    name="static"
)


# ==========================================
# Security Configuration
# ==========================================

SECRET_KEY = os.getenv(
    "SECRET_KEY",
    "CHANGE_THIS_TO_A_LONG_RANDOM_SECRET_FOR_LOCAL_DEVELOPMENT"
)

ALGORITHM = "HS256"
TOKEN_MINUTES = 60

password_hash = PasswordHash.recommended()

security = HTTPBearer(auto_error=False)


# ==========================================
# Database Configuration
# ==========================================

def get_db() -> Iterator[sqlite3.Connection]:

    db = sqlite3.connect(
        DB_PATH,
        timeout=10,
        check_same_thread=False
    )

    db.row_factory = sqlite3.Row
    

    db.execute("PRAGMA foreign_keys = ON")

    try:
        yield db
    finally:
        db.close()


def initialize_database():

    db = sqlite3.connect(DB_PATH, timeout=10)

    db.execute("PRAGMA foreign_keys = ON")

    # Migrate the old user table name if necessary
    old_table = db.execute(
        """
        SELECT name FROM sqlite_master
        WHERE type = 'table' AND name = 'user'
        """
    ).fetchone()

    new_table = db.execute(
        """
        SELECT name FROM sqlite_master
        WHERE type = 'table' AND name = 'users'
        """
    ).fetchone()

    if old_table and not new_table:
        db.execute("ALTER TABLE user RENAME TO users")

    # Users table
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            phone TEXT NOT NULL UNIQUE,
            role TEXT NOT NULL DEFAULT 'user'
                CHECK(role IN ('user', 'admin'))
        )
        """
    )

    # Storage table
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS storage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            price INTEGER NOT NULL CHECK(price >= 0),
            quantity INTEGER NOT NULL CHECK(quantity >= 0),
            all_price INTEGER GENERATED ALWAYS AS
                (price * quantity) STORED
        )
        """
    )

    # Employees table
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS employees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            phone TEXT NOT NULL UNIQUE
        )
        """
    )

    # Tasks table
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT '0'
                CHECK(status IN ('0', '1')),
            user_id INTEGER NOT NULL,
            FOREIGN KEY (user_id)
                REFERENCES users(id)
                ON DELETE CASCADE
        )
        """
    )

    db.commit()
    db.close()


@app.on_event("startup")
def startup():
    initialize_database()


# ==========================================
# JWT Authentication
# ==========================================

def create_token(user_id: int):

    now = datetime.now(timezone.utc)

    data = {
        "user_id": user_id,
        "iat": now,
        "exp": now + timedelta(minutes=TOKEN_MINUTES)
    }

    return jwt.encode(
        data,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


# ==========================================
# Get Current User
# ==========================================

def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: sqlite3.Connection = Depends(get_db)
):

    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Please login first"
        )

    token = credentials.credentials

    try:

        data = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        user_id = data.get("user_id")

        if not isinstance(user_id, int) or isinstance(user_id, bool):
            raise HTTPException(
                status_code=401,
                detail="Invalid token"
            )

    except jwt.ExpiredSignatureError:

        raise HTTPException(
            status_code=401,
            detail="Token expired"
        )

    except jwt.InvalidTokenError:

        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )

    user = db.execute(
        """
        SELECT id, username, email, phone, role
        FROM users
        WHERE id = ?
        """,
        (user_id,)
    ).fetchone()

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    return dict(user)


# ==========================================
# Admin Authorization
# ==========================================

def get_current_admin(
    current_user: dict = Depends(get_current_user)
):

    if current_user["role"] != "admin":

        raise HTTPException(
            status_code=403,
            detail="Access denied"
        )

    return current_user


# ==========================================
# Pydantic Models
# ==========================================

class SignupUser(BaseModel):

    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=6)
    email: str = Field(min_length=6, max_length=254)
    phone: str = Field(min_length=5, max_length=20)


class LoginUser(BaseModel):

    username: str
    password: str


class Item(BaseModel):

    name: str = Field(min_length=1, max_length=100)
    price: int = Field(ge=0)
    quantity: int = Field(ge=0)


class Employee(BaseModel):

    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=6)
    email: str = Field(min_length=6, max_length=254)
    phone: str = Field(min_length=5, max_length=20)


class Task(BaseModel):

    name: str = Field(min_length=1, max_length=100)
    description: str = Field(min_length=1, max_length=1000)


# ==========================================
# Signup
# ==========================================

@app.post("/signup", status_code=201)
def register(
    user: SignupUser,
    db: sqlite3.Connection = Depends(get_db)
):

    try:

        db.execute(
            """
            INSERT INTO users (
                username, password, email, phone
            )
            VALUES (?, ?, ?, ?)
            """,
            (
                user.username.strip(),
                password_hash.hash(user.password),
                user.email.strip(),
                user.phone.strip()
            )
        )

        db.commit()

    except sqlite3.IntegrityError:

        raise HTTPException(
            status_code=409,
            detail="Username, email or phone already exists"
        )

    return {
        "message": "Account created successfully"
    }


# ==========================================
# Login
# ==========================================

@app.post("/login")
def login(
    user_i: LoginUser,
    db: sqlite3.Connection = Depends(get_db)
):

    user = db.execute(
        """
        SELECT id, username, password
        FROM users
        WHERE username = ?
        """,
        (user_i.username.strip(),)
    ).fetchone()

    if user is None:

        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    try:

        correct_password = password_hash.verify(
            user_i.password,
            user["password"]
        )

    except (TypeError, ValueError):

        correct_password = False

    if not correct_password:

        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    return {
        "access_token": create_token(user["id"]),
        "token_type": "bearer"
    }


# ==========================================
# Current User Information
# ==========================================

@app.get("/me")
def get_me(
    current_user: dict = Depends(get_current_user)
):

    return current_user


# ==========================================
# Storage Endpoints
# ==========================================

@app.get("/storage")
def get_storage(
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):

    storage = db.execute(
        "SELECT * FROM storage"
    ).fetchall()

    return [dict(item) for item in storage]


@app.post("/add_item", status_code=201)
def add_item(
    item: Item,
    current_user: dict = Depends(get_current_admin),
    db: sqlite3.Connection = Depends(get_db)
):

    try:

        db.execute(
            """
            INSERT INTO storage (name, price, quantity)
            VALUES (?, ?, ?)
            """,
            (item.name, item.price, item.quantity)
        )

        db.commit()

    except sqlite3.IntegrityError:

        raise HTTPException(
            status_code=409,
            detail="Item name already exists"
        )

    return {
        "message": "Item added successfully"
    }


@app.put("/update_item/{item_id}")
def update_item(
    item_id: int,
    item: Item,
    current_user: dict = Depends(get_current_admin),
    db: sqlite3.Connection = Depends(get_db)
):

    try:

        result = db.execute(
            """
            UPDATE storage
            SET name = ?, price = ?, quantity = ?
            WHERE id = ?
            """,
            (item.name, item.price, item.quantity, item_id)
        )

        if result.rowcount == 0:

            raise HTTPException(
                status_code=404,
                detail="Item not found"
            )

        db.commit()

    except sqlite3.IntegrityError:

        raise HTTPException(
            status_code=409,
            detail="Item name already exists"
        )

    return {
        "message": "Item updated successfully"
    }


@app.put("/update_quantity/{item_id}")
def update_quantity(
    item_id: int,
    quantity: int = Query(ge=0),
    current_user: dict = Depends(get_current_admin),
    db: sqlite3.Connection = Depends(get_db)
):

    result = db.execute(
        """
        UPDATE storage
        SET quantity = ?
        WHERE id = ?
        """,
        (quantity, item_id)
    )

    if result.rowcount == 0:

        raise HTTPException(
            status_code=404,
            detail="Item not found"
        )

    db.commit()

    return {
        "message": "Quantity updated successfully"
    }


@app.delete("/empty_storage")
def empty_storage(
    current_user: dict = Depends(get_current_admin),
    db: sqlite3.Connection = Depends(get_db)
):

    db.execute("DELETE FROM storage")

    db.commit()

    return {
        "message": "Storage emptied successfully"
    }


@app.delete("/delete_item/{item_id}")
def delete_item(
    item_id: int,
    current_user: dict = Depends(get_current_admin),
    db: sqlite3.Connection = Depends(get_db)
):

    result = db.execute(
        "DELETE FROM storage WHERE id = ?",
        (item_id,)
    )

    if result.rowcount == 0:

        raise HTTPException(
            status_code=404,
            detail="Item not found"
        )

    db.commit()

    return {
        "message": "Item deleted successfully"
    }


# ==========================================
# Employee Endpoints
# ==========================================

@app.post("/add_employee", status_code=201)
def add_employee(
    employee: Employee,
    current_user: dict = Depends(get_current_admin),
    db: sqlite3.Connection = Depends(get_db)
):

    try:

        db.execute(
            """
            INSERT INTO employees (
                username, password, email, phone
            )
            VALUES (?, ?, ?, ?)
            """,
            (
                employee.username.strip(),
                password_hash.hash(employee.password),
                employee.email.strip(),
                employee.phone.strip()
            )
        )

        db.commit()

    except sqlite3.IntegrityError:

        raise HTTPException(
            status_code=409,
            detail="Employee information already exists"
        )

    return {
        "message": "Employee added successfully"
    }


@app.get("/employees")
def get_employees(
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):

    employees = db.execute(
        """
        SELECT id, username, email, phone
        FROM employees
        """
    ).fetchall()

    return [dict(employee) for employee in employees]


@app.delete("/delete_employee/{employee_id}")
def delete_employee(
    employee_id: int,
    current_user: dict = Depends(get_current_admin),
    db: sqlite3.Connection = Depends(get_db)
):

    result = db.execute(
        "DELETE FROM employees WHERE id = ?",
        (employee_id,)
    )

    if result.rowcount == 0:

        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    db.commit()

    return {
        "message": "Employee deleted successfully"
    }


# ==========================================
# Task Endpoints
# ==========================================

@app.get("/tasks")
def get_tasks(
    current_user: dict = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db)
):

    user_id = current_user["id"]

    tasks_not_finished = db.execute(
        """
        SELECT * FROM tasks
        WHERE user_id = ? AND status = '0'
        """,
        (user_id,)
    ).fetchall()

    tasks_finished = db.execute(
        """
        SELECT * FROM tasks
        WHERE user_id = ? AND status = '1'
        """,
        (user_id,)
    ).fetchall()

    return {
        "pending": [dict(task) for task in tasks_not_finished],
        "completed": [dict(task) for task in tasks_finished]
    }


@app.post("/tasks", status_code=201)
def create_task(
    task: Task,
    current_user: dict = Depends(get_current_admin),
    db: sqlite3.Connection = Depends(get_db)
):

    user_id = current_user["id"]

    db.execute(
        """
        INSERT INTO tasks (name, description, user_id)
        VALUES (?, ?, ?)
        """,
        (
            task.name,
            task.description,
            user_id
        )
    )

    db.commit()

    return {
        "message": "Task created successfully"
    }


@app.put("/tasks/checked/{task_id}")
def check_task(
    task_id: int,
    current_user: dict = Depends(get_current_admin),
    db: sqlite3.Connection = Depends(get_db)
):

    result = db.execute(
        """
        UPDATE tasks
        SET status = '1'
        WHERE id = ?
        """,
        (task_id,)
    )

    if result.rowcount == 0:

        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    db.commit()

    return {
        "message": "Task completed successfully"
    }
