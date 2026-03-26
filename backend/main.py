import os
from pathlib import Path

import mysql.connector
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mysql.connector import Error

load_dotenv(Path(__file__).with_name(".env"))

app = FastAPI()

# This allows your React frontend (usually on port 3000) to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, you'd limit this to your React URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database configuration
db_config = {
    "host": "localhost",       # "Abhis-comp" is your local machine name
    "port": 3308,              # CRITICAL: Your MySQL is on 3308, not 3306!
    "user": os.getenv("SQL_USER"),            # Standard default user
    "password": os.getenv("SQL_PASSWORD"),# Use your actual password here
    "database": "marketplacedb" # This is the schema name from your previous screenshot
}

@app.get("/")
def read_root():
    return {"message": "Welcome to the Hokie Market API"}

@app.get("/api/test-db")
def test_db_connection():
    try:
        connection = mysql.connector.connect(**db_config)
        if connection.is_connected():
            cursor = connection.cursor()
            cursor.execute("SELECT DATABASE();")
            db_name = cursor.fetchone()
            connection.close()
            return {"status": "Success", "database": db_name[0]}
    except Error as e:
        return {"status": "Error", "message": str(e)}
