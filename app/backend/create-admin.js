// Simple script to create first admin user in SQLite
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');

const dbPath = './src/prisma/dev.db';

async function createAdminUser() {
    return new Promise(async (resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('❌ Could not connect to database:', err);
                reject(err);
                return;
            }
            console.log('✅ Connected to SQLite database');
        });

        try {
            // Hash password
            const hashedPassword = await bcrypt.hash('Admin@123', 10);

            // Create role ID
            const roleId = randomUUID();
            const userId = randomUUID();

            // Insert Admin role
            db.run(
                `INSERT INTO roles (id, name, description, createdAt, updatedAt) 
                 VALUES (?, ?, ?, datetime('now'), datetime('now'))`,
                [roleId, 'Admin', 'System Administrator'],
                function (err) {
                    if (err) {
                        console.error('❌ Error creating role:', err.message);
                        db.close();
                        reject(err);
                        return;
                    }
                    console.log('✅ Created Admin role');

                    // Insert Admin user
                    db.run(
                        `INSERT INTO users (id, email, password, firstName, lastName, roleId, isActive, createdAt, updatedAt)
                         VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
                        [userId, 'admin@hospital.local', hashedPassword, 'System', 'Admin', roleId],
                        function (err) {
                            if (err) {
                                console.error('❌ Error creating user:', err.message);
                                db.close();
                                reject(err);
                                return;
                            }
                            console.log('✅ Created admin user!');
                            console.log('');
                            console.log('📧 Email: admin@hospital.local');
                            console.log('🔑 Password: Admin@123');
                            console.log('');
                            console.log('⚠️  Change this password immediately!');

                            db.close((err) => {
                                if (err) {
                                    reject(err);
                                } else {
                                    resolve();
                                }
                            });
                        }
                    );
                }
            );
        } catch (error) {
            console.error('❌ Error:', error);
            db.close();
            reject(error);
        }
    });
}

createAdminUser()
    .then(() => {
        console.log('✅ Setup complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Setup failed:', error);
        process.exit(1);
    });
