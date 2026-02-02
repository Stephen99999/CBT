const { User, sequelize } = require('../models'); // Adjust path to your models folder
const bcrypt = require('bcryptjs'); // Make sure you have bcrypt installed

const createAdmin = async () => {
  try {
    // 1. Get arguments from the command line
    // Usage: node scripts/createAdmin.js <matric_no> <password> <name>
    const args = process.argv.slice(2);

    if (args.length < 3) {
      console.log('Usage: node scripts/createAdmin.js <matric_no> <password> <name>');
      process.exit(1);
    }

    const [matric_no, plainPassword, name] = args;

    // 2. Check if user already exists
    const existingUser = await User.findOne({ where: { matric_no } });
    if (existingUser) {
      console.log('Error: A user with this Matric No already exists.');
      process.exit(1);
    }

    // 3. Hash the password
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // 4. Create the Admin User
    const admin = await User.create({
      name: name,
      matric_no: matric_no,
      password: hashedPassword,
      role: 'admin' // <--- This is the important part!
    });

    console.log(`✅ Admin created successfully: ${admin.name} (${admin.matric_no})`);

  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
  } finally {
    // 5. Close the database connection
    await sequelize.close();
  }
};

createAdmin();