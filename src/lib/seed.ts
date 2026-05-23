import bcrypt from 'bcryptjs';
import User from '@/models/User';
import Game from '@/models/Game';

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

export async function seedGames() {
  try {
    const count = await Game.countDocuments();
    if (count === 0) {
      const defaultGames = [
        { name: 'FireKirin', image: '/games/fire_kirin.png', link: 'https://firekirin.xyz/' },
        { name: 'OrionStar', image: '/games/orion_stars.png', link: 'https://orionstars.club/' },
        { name: 'Juwa', image: '/games/fire_kirin.png', link: 'https://juwa.xyz/' },
        { name: 'Game Vault', image: '/games/orion_stars.png', link: 'https://gamevault.vip/' },
        { name: 'VegasSweep', image: '/games/ultra_panda.png', link: 'https://vegassweeps.com/' },
        { name: 'MilkyWay', image: '/games/orion_stars.png', link: 'https://milkywayapp.xyz/' },
        { name: 'Ultra Panda', image: '/games/ultra_panda.png', link: 'https://ultrapanda.xyz/' },
        { name: 'Cash Frenzy', image: '/games/fire_kirin.png', link: 'https://cashfrenzy.xyz/' },
        { name: 'V Blink', image: '/games/orion_stars.png', link: 'https://vblink.xyz/' },
        { name: 'River Sweeps', image: '/games/ultra_panda.png', link: 'https://riversweeps.org/' },
        { name: 'HighStake', image: '/games/fire_kirin.png', link: 'https://highstake.xyz/' },
        { name: 'Vegas X', image: '/games/orion_stars.png', link: 'https://vegas-x.org/' },
      ];
      await Game.insertMany(defaultGames);
      console.log('Seeded 12 default games');
    }
  } catch (error) {
    console.error('Error seeding games:', error);
  }
}
