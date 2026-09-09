// const { PrismaClient } = require("@prisma/client");

// const prisma = new PrismaClient();

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: {
      email: "admin@example.com",
    },
    update: {},
    create: {
      username: "admin",
      email: "admin@example.com",
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  console.log("Admin created:", admin.email, admin.role);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

module.exports = prisma;
