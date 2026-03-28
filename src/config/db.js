const mysql = require('mysql2/promise');
require('dotenv').config();

// Create pool without specifying the database first to allow creating it if missing
const poolWithoutDB = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 30,
    queueLimit: 0
});

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'churrascaria_bot',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 30,
    queueLimit: 0
});

// A helper function to initialize DB and seed if needed
async function initDB() {
    try {
        const fs = require('fs');
        const path = require('path');
        
        // Ensure Database exists
        await poolWithoutDB.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'churrascaria_bot'}\``);
        
        // Execute Schema
        const schemaPath = path.join(__dirname, '../database', 'schema.sql');
        const schemaQuery = fs.readFileSync(schemaPath, 'utf8');
        
        // Very basic way to execute multiple queries: connection.query doesn't support multipleStatements by default 
        // without passing multipleStatements: true, but we'll manually split them for simple init.
        // For robustness, it's better to pass multipleStatements in connection, but let's do safe split.
        const poolWithMultiple = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || '',
            database: process.env.DB_NAME || 'churrascaria_bot',
            port: process.env.DB_PORT || 3306,
            multipleStatements: true
        });

        await poolWithMultiple.query(schemaQuery);

        console.log("Database and tables initialized!");

        // Execute Seed
        const seedPath = path.join(__dirname, '../database', 'seed.sql');
        const seedQuery = fs.readFileSync(seedPath, 'utf8');
        await poolWithMultiple.query(seedQuery);

        console.log("Database seeded successfully!");
        poolWithMultiple.end();

    } catch (err) {
        console.error("Error initializing Database:", err);
    }
}

module.exports = {
    pool,
    initDB
};

