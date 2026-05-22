import bcrypt from 'bcryptjs';
import User from '@/models/User';

export async function seedSuperAdmin() {
  try {
    const email = (process.env.SUPER_ADMIN_EMAIL || 'superadmin@royalegaming.com').toLowerCase();
    const superAdmin = await User.findOne({ email });
    if (!superAdmin) {
      const password = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin2026!';
      const hashedPassword = await bcrypt.hash(password, 10);

      const newSuperAdmin = new User({
        name: 'Super Admin',
        email,
        phone: '+1234567890',
        password: hashedPassword,
        role: 'super_admin',
      });

      await newSuperAdmin.save();
      console.log('Seeded default super admin account:', email);
    }
  } catch (error) {
    console.error('Error seeding super admin:', error);
  }
}
