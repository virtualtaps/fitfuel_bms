import { getDatabase } from '../lib/mongodb';
import { createUser, findUserByEmail, getUserCollection } from '../lib/models/User';
import { hashPassword } from '../lib/auth';

async function seed() {
    try {
        console.log('🌱 Starting seed...');

        // Connect to database
        const db = await getDatabase();
        console.log('✅ Connected to database');

        // Delete old admin user if it exists
        const oldAdmin = await findUserByEmail('king@desert.com');
        if (oldAdmin) {
            console.log('🗑️  Deleting old admin user: king@desert.com');
            const collection = await getUserCollection();
            await collection.deleteOne({ email: 'king@desert.com' });
            console.log('✅ Old admin user deleted');
        } else {
            console.log('ℹ️  No old admin user found (king@desert.com)');
        }

        // Check if new admin user already exists
        const existingAdmin = await findUserByEmail('admin@fitfuel.com');

        const hashedPassword = await hashPassword('Admin123');

        if (existingAdmin) {
            console.log('🔄 Admin user already exists, updating password...');
            const collection = await getUserCollection();
            await collection.updateOne(
                { email: 'admin@fitfuel.com' },
                {
                    $set: {
                        password: hashedPassword,
                        updatedAt: new Date()
                    }
                }
            );
            console.log('✅ Admin user password updated successfully!');
            console.log(`   Email: ${existingAdmin.email}`);
            console.log(`   Name: ${existingAdmin.name}`);
            console.log(`   Role: ${existingAdmin.role}`);
            console.log(`   ID: ${existingAdmin._id}`);
        } else {
            // Create new admin user
            console.log('📝 Creating admin user...');

            const adminUser = await createUser({
                email: 'admin@fitfuel.com',
                password: hashedPassword,
                name: 'Admin',
                role: 'admin',
            });

            console.log('✅ Admin user created successfully!');
            console.log(`   Email: ${adminUser.email}`);
            console.log(`   Name: ${adminUser.name}`);
            console.log(`   Role: ${adminUser.role}`);
            console.log(`   ID: ${adminUser._id}`);
        }

        console.log('✅ Seed completed successfully!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
}

// Run the seed function
seed();

