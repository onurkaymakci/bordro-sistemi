const { PrismaClient } = require('@prisma/client');

// Tek bir PrismaClient ornegi uygulama boyunca paylasilir.
const prisma = new PrismaClient();

module.exports = prisma;
