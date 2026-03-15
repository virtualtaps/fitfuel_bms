import { config } from 'dotenv';
import { resolve } from 'path';
import { getDatabase } from '../lib/mongodb';
import { createUser, findUserByEmail, getUserCollection } from '../lib/models/User';
import { hashPassword } from '../lib/auth';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function seed() {
    try {
        console.log('🌱 Starting seed...');

        // Connect to database
        const db = await getDatabase();
        console.log('✅ Connected to database');

        // Check if first admin user already exists
        const existingAdmin1 = await findUserByEmail('admin@fitfuel.com');
        const hashedPassword1 = await hashPassword('Admin123');

        if (existingAdmin1) {
            console.log('🔄 Admin user (admin@fitfuel.com) already exists, updating password...');
            const collection = await getUserCollection();
            await collection.updateOne(
                { email: 'admin@fitfuel.com' },
                {
                    $set: {
                        password: hashedPassword1,
                        updatedAt: new Date()
                    }
                }
            );
            console.log('✅ Admin user password updated successfully!');
            console.log(`   Email: ${existingAdmin1.email}`);
            console.log(`   Name: ${existingAdmin1.name}`);
            console.log(`   Role: ${existingAdmin1.role}`);
            console.log(`   ID: ${existingAdmin1._id}`);
        } else {
            console.log('📝 Creating admin user (admin@fitfuel.com)...');
            const adminUser1 = await createUser({
                email: 'admin@fitfuel.com',
                password: hashedPassword1,
                name: 'Admin',
                role: 'admin',
            });
            console.log('✅ Admin user created successfully!');
            console.log(`   Email: ${adminUser1.email}`);
            console.log(`   Name: ${adminUser1.name}`);
            console.log(`   Role: ${adminUser1.role}`);
            console.log(`   ID: ${adminUser1._id}`);
        }

        // Check if second admin user already exists
        const existingAdmin2 = await findUserByEmail('rehaann.dev@gmail.com');
        const hashedPassword2 = await hashPassword('Resh@n522');

        if (existingAdmin2) {
            console.log('🔄 Admin user (rehaann.dev@gmail.com) already exists, updating password...');
            const collection = await getUserCollection();
            await collection.updateOne(
                { email: 'rehaann.dev@gmail.com' },
                {
                    $set: {
                        password: hashedPassword2,
                        updatedAt: new Date()
                    }
                }
            );
            console.log('✅ Admin user password updated successfully!');
            console.log(`   Email: ${existingAdmin2.email}`);
            console.log(`   Name: ${existingAdmin2.name}`);
            console.log(`   Role: ${existingAdmin2.role}`);
            console.log(`   ID: ${existingAdmin2._id}`);
        } else {
            console.log('📝 Creating admin user (rehaann.dev@gmail.com)...');
            const adminUser2 = await createUser({
                email: 'rehaann.dev@gmail.com',
                password: hashedPassword2,
                name: 'Rehaan',
                role: 'admin',
            });
            console.log('✅ Admin user created successfully!');
            console.log(`   Email: ${adminUser2.email}`);
            console.log(`   Name: ${adminUser2.name}`);
            console.log(`   Role: ${adminUser2.role}`);
            console.log(`   ID: ${adminUser2._id}`);
        }

        // Check if third admin user already exists
        const existingAdmin3 = await findUserByEmail('rehanaleey522@gmail.com');
        const hashedPassword3 = await hashPassword('Resh@n522');

        if (existingAdmin3) {
            console.log('🔄 Admin user (rehanaleey522@gmail.com) already exists, updating password...');
            const collection = await getUserCollection();
            await collection.updateOne(
                { email: 'rehanaleey522@gmail.com' },
                {
                    $set: {
                        password: hashedPassword3,
                        updatedAt: new Date()
                    }
                }
            );
            console.log('✅ Admin user password updated successfully!');
            console.log(`   Email: ${existingAdmin3.email}`);
            console.log(`   Name: ${existingAdmin3.name}`);
            console.log(`   Role: ${existingAdmin3.role}`);
            console.log(`   ID: ${existingAdmin3._id}`);
        } else {
            console.log('📝 Creating admin user (rehanaleey522@gmail.com)...');
            const adminUser3 = await createUser({
                email: 'rehanaleey522@gmail.com',
                password: hashedPassword3,
                name: 'Rehan',
                role: 'admin',
            });
            console.log('✅ Admin user created successfully!');
            console.log(`   Email: ${adminUser3.email}`);
            console.log(`   Name: ${adminUser3.name}`);
            console.log(`   Role: ${adminUser3.role}`);
            console.log(`   ID: ${adminUser3._id}`);
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

