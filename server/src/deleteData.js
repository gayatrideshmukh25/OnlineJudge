const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  await prisma.submission.deleteMany({});

  console.log("All records deleted");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
