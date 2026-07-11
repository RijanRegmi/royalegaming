import bcrypt from 'bcryptjs';
import User from '@/models/User';
import Game from '@/models/Game';

export async function seedSuperAdmin() {
  try {
    const email = (process.env.SUPER_ADMIN_EMAIL || 'superadmin@rilogram.com').toLowerCase();
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
        { name: 'TaskFlow', image: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?q=80&w=400&auto=format&fit=crop', link: 'https://taskflow.dev/', agentLink: 'https://taskflow.dev/' },
        { name: 'TeamSync', image: 'https://images.unsplash.com/photo-1531538606174-0f90ff5dce83?q=80&w=400&auto=format&fit=crop', link: 'https://teamsync.tools/', agentLink: 'https://teamsync.tools/' },
        { name: 'DocuShare', image: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?q=80&w=400&auto=format&fit=crop', link: 'https://docushare.io/', agentLink: 'https://docushare.io/' },
        { name: 'CloudVault', image: 'https://images.unsplash.com/photo-1600132806370-bf17e65e942f?q=80&w=400&auto=format&fit=crop', link: 'https://cloudvault.app/', agentLink: 'https://cloudvault.app/' },
        { name: 'BoardHub', image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=400&auto=format&fit=crop', link: 'https://boardhub.net/', agentLink: 'https://boardhub.net/' },
        { name: 'ProjectSpace', image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=400&auto=format&fit=crop', link: 'https://projectspace.co/', agentLink: 'https://projectspace.co/' },
        { name: 'CRM Connect', image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=400&auto=format&fit=crop', link: 'https://crmconnect.dev/', agentLink: 'https://crmconnect.dev/' },
        { name: 'DevCollab', image: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?q=80&w=400&auto=format&fit=crop', link: 'https://devcollab.net/', agentLink: 'https://devcollab.net/' },
        { name: 'MeetLink', image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=400&auto=format&fit=crop', link: 'https://meetlink.app/', agentLink: 'https://meetlink.app/' },
        { name: 'NoteStream', image: 'https://images.unsplash.com/photo-1517842645767-c639042777db?q=80&w=400&auto=format&fit=crop', link: 'https://notestream.io/', agentLink: 'https://notestream.io/' },
        { name: 'Analytix', image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=400&auto=format&fit=crop', link: 'https://analytix.info/', agentLink: 'https://analytix.info/' },
        { name: 'ApexWork', image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=400&auto=format&fit=crop', link: 'https://apexwork.space/', agentLink: 'https://apexwork.space/' }
      ];
      await Game.insertMany(defaultGames);
      console.log('Seeded 12 default products with agent links');
    }
  } catch (error) {
    console.error('Error seeding games:', error);
  }
}
