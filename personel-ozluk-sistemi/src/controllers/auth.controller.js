const bcrypt = require('bcryptjs');
const { z } = require('zod');
const prisma = require('../config/prisma');
const { signToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');

// PRD 10.1 Giris Ekrani: Sirket Kodu + Kullanici Adi/E-posta + Sifre
const loginSchema = z.object({
  companyCode: z.string().min(1).optional(), // SYSTEM_ADMIN icin gerekmez
  emailOrUsername: z.string().min(1),
  password: z.string().min(1),
});

async function login(req, res) {
  const { companyCode, emailOrUsername, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: emailOrUsername }, { username: emailOrUsername }],
    },
    include: { company: true },
  });

  if (!user || !user.isActive) {
    throw new ApiError(401, 'Kullanici adi/e-posta veya sifre hatali.');
  }

  // SYSTEM_ADMIN disindaki kullanicilar icin sirket kodu dogrulanir (multi-tenant izolasyon)
  if (user.role !== 'SYSTEM_ADMIN') {
    if (!companyCode || user.company?.companyCode !== companyCode) {
      throw new ApiError(401, 'Sirket kodu hatali.');
    }
    if (!user.company?.isActive) {
      throw new ApiError(403, 'Sirket hesabi pasif durumda.');
    }
  }

  const passwordOk = await bcrypt.compare(password, user.passwordHash);
  if (!passwordOk) {
    throw new ApiError(401, 'Kullanici adi/e-posta veya sifre hatali.');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const token = signToken({
    id: user.id,
    companyId: user.companyId,
    role: user.role,
    email: user.email,
  });

  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        companyName: user.company?.name || null,
      },
    },
  });
}

async function me(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { company: true },
    select: undefined,
  });
  if (!user) throw new ApiError(404, 'Kullanici bulunamadi.');

  const { passwordHash, ...safeUser } = user;
  res.json({ success: true, data: safeUser });
}

const registerCompanySchema = z.object({
  companyName: z.string().min(2),
  companyCode: z.string().min(3),
  taxNumber: z.string().optional(),
  adminFullName: z.string().min(2),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
});

/**
 * PRD MVP Basari Kriteri: "Bir sirket sisteme kayit olabilmeli, anahtar
 * kullanici olusturabilmeli." Bu uc nokta yeni bir sirket + ilk KEY_USER
 * (Anahtar Kullanici) hesabini tek islemde olusturur.
 */
async function registerCompany(req, res) {
  const data = registerCompanySchema.parse(req.body);

  const existing = await prisma.company.findUnique({
    where: { companyCode: data.companyCode },
  });
  if (existing) {
    throw new ApiError(409, 'Bu sirket kodu zaten kullaniliyor.');
  }

  const passwordHash = await bcrypt.hash(data.adminPassword, 10);

  const company = await prisma.company.create({
    data: {
      name: data.companyName,
      companyCode: data.companyCode,
      taxNumber: data.taxNumber,
      users: {
        create: {
          fullName: data.adminFullName,
          email: data.adminEmail,
          passwordHash,
          role: 'KEY_USER',
        },
      },
    },
    include: { users: true },
  });

  res.status(201).json({
    success: true,
    data: {
      companyId: company.id,
      companyCode: company.companyCode,
      adminUserId: company.users[0].id,
    },
  });
}

module.exports = { login, me, registerCompany };
