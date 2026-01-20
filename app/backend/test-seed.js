const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'file:./src/prisma/dev.db'
        }
    }
});

async function main() {
    console.log('Testing SQLite connection...');

    // Test connection
    await prisma.$connect();
    console.log('✅ Connected to database');

    // Create one role
    console.log('Creating Admin role...');
    const adminRole = await prisma.role.create({
        data: {
            name: 'Admin',
            description: 'Administrator'
        }
    });
    console.log('✅ Created role:', adminRole);

    // Create one user
    console.log('Creating admin user...');
    const hashedPassword = await bcrypt.hash('Admin@123', 10);
    const adminUser = await prisma.user.create({
        data: {
            email: 'admin@hospital.local',
            password: hashedPassword,
            firstName: 'System',
            lastName: 'Admin',
            roleId: adminRole.id
        }
    });
    console.log('✅ Created user:', adminUser.email);
    console.log('✅ Seed successful!');
}

main()
    .catch(e => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
