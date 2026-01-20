import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seeding...');

    // Create roles
    console.log('📋 Creating roles...');
    const roles = await Promise.all([
        prisma.role.upsert({
            where: { name: 'Admin' },
            update: {},
            create: {
                name: 'Admin',
                description: 'Full system access with administrative privileges',
            },
        }),
        prisma.role.upsert({
            where: { name: 'Doctor' },
            update: {},
            create: {
                name: 'Doctor',
                description: 'Medical practitioners who can diagnose and prescribe',
            },
        }),
        prisma.role.upsert({
            where: { name: 'Nurse' },
            update: {},
            create: {
                name: 'Nurse',
                description: 'Nursing staff with patient care responsibilities',
            },
        }),
        prisma.role.upsert({
            where: { name: 'Pharmacist' },
            update: {},
            create: {
                name: 'Pharmacist',
                description: 'Pharmacy staff managing medications and inventory',
            },
        }),
        prisma.role.upsert({
            where: { name: 'Receptionist' },
            update: {},
            create: {
                name: 'Receptionist',
                description: 'Front desk staff managing appointments and patient registration',
            },
        }),
    ]);

    console.log(`✅ Created ${roles.length} roles`);

    // Create default admin user
    console.log('👤 Creating default admin user...');
    const adminRole = roles.find((r: any) => r.name === 'Admin');
    if (!adminRole) throw new Error('Admin role not found');

    const hashedPassword = await bcrypt.hash('Admin@123', 10);

    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@theophilus.local' },
        update: {},
        create: {
            email: 'admin@theophilus.local',
            password: hashedPassword,
            firstName: 'System',
            lastName: 'Administrator',
            phoneNumber: '+1234567890',
            roleId: adminRole.id,
            isActive: true,
        },
    });

    console.log('✅ Created admin user:', adminUser.email);

    // Create sample doctor
    const doctorRole = roles.find((r: any) => r.name === 'Doctor');
    if (doctorRole) {
        const doctorPassword = await bcrypt.hash('Doctor@123', 10);
        const doctor = await prisma.user.upsert({
            where: { email: 'doctor@theophilus.local' },
            update: {},
            create: {
                email: 'doctor@theophilus.local',
                password: doctorPassword,
                firstName: 'John',
                lastName: 'Smith',
                phoneNumber: '+1234567891',
                roleId: doctorRole.id,
                isActive: true,
            },
        });
        console.log('✅ Created sample doctor:', doctor.email);
    }

    // Create sample medications
    console.log('💊 Creating sample pharmacy stock...');
    const medications = [
        {
            medicationName: 'Paracetamol 500mg',
            description: 'Pain reliever and fever reducer',
            category: 'Painkiller',
            currentStock: 500,
            minimumStock: 100,
            reorderLevel: 100,
            costPrice: 0.3,
            sellingPrice: 0.5,
            unitPrice: 0.5,
        },
        {
            medicationName: 'Amoxicillin 250mg',
            description: 'Antibiotic for bacterial infections',
            category: 'Antibiotic',
            currentStock: 300,
            minimumStock: 50,
            reorderLevel: 50,
            costPrice: 1.5,
            sellingPrice: 2.5,
            unitPrice: 2.5,
        },
        {
            medicationName: 'Ibuprofen 400mg',
            description: 'Anti-inflammatory and pain reliever',
            category: 'Painkiller',
            currentStock: 400,
            minimumStock: 80,
            reorderLevel: 80,
            costPrice: 0.45,
            sellingPrice: 0.75,
            unitPrice: 0.75,
        },
        {
            medicationName: 'Omeprazole 20mg',
            description: 'Proton pump inhibitor for acid reflux',
            category: 'Gastrointestinal',
            currentStock: 200,
            minimumStock: 40,
            reorderLevel: 40,
            costPrice: 0.7,
            sellingPrice: 1.2,
            unitPrice: 1.2,
        },
    ];

    for (const med of medications) {
        await prisma.pharmacyStock.upsert({
            where: { medicationName: med.medicationName },
            update: {},
            create: med,
        });
    }

    console.log(`✅ Created ${medications.length} medications in stock`);

    console.log('\n✨ Database seeding completed successfully!');
    console.log('\n📝 Default credentials:');
    console.log('   Admin: admin@theophilus.local / Admin@123');
    console.log('   Doctor: doctor@theophilus.local / Doctor@123');
    console.log('\n⚠️  Please change these passwords immediately in production!');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
