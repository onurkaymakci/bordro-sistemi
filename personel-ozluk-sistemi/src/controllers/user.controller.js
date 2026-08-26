const bcrypt = require('bcryptjs');
const { z } = require('zod');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');

// PRD 10.8 Kullanici ve Yetkilendirme Ekrani
const createUserSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  username: z.string().min(3).optional(),
  password: z.string().min(8),
  role: z.enum(['HR_SPECIALIST', 'MANAGER', 'EMPLOYEE', 'KEY_USER']),
});

async function list(req, res) {
  const users = await prisma.user.findMany({
    where: { companyId: req.companyId },
    select: {
      id: true, fullName: true, email: true, username: true,
      role: true, isActive: true, lastLoginAt: true, createdAt: true,
    },
    orderBy: { fullName: 'asc' },
  });
  res.json({ success: true, data: users });
}

async function create(req, res) {
  const data = createUserSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new ApiError(409, 'Bu e-posta adresi zaten kayitli.');

  const passwordHash = await bcrypt.hash(data.password, 10);

  const user = await prisma.user.create({
    data: {
      fullName: data.fullName,
      email: data.email,
      username: data.username,
      passwordHash,
      role: data.role,
      companyId: req.companyId,
    },
  });

  const { passwordHash: _omit, ...safeUser } = user;
  res.status(201).json({ success: true, data: safeUser });
}

// PRD 10.8 - Kullanici Pasiflestirme
async function deactivate(req, res) {
  const user = await prisma.user.findFirst({
    where: { id: req.params.id, companyId: req.companyId },
  });
  if (!user) throw new ApiError(404, 'Kullanici bulunamadi.');

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { isActive: false },
  });

  res.json({ success: true, data: { id: updated.id, isActive: updated.isActive } });
}

const roleSchema = z.object({
  role: z.enum(['HR_SPECIALIST', 'MANAGER', 'EMPLOYEE', 'KEY_USER']),
});

// PRD 10.8 - Rol Atama
async function updateRole(req, res) {
  const { role } = roleSchema.parse(req.body);

  const user = await prisma.user.findFirst({
    where: { id: req.params.id, companyId: req.companyId },
  });
  if (!user) throw new ApiError(404, 'Kullanici bulunamadi.');

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { role },
  });

  res.json({ success: true, data: { id: updated.id, role: updated.role } });
}

module.exports = { list, create, deactivate, updateRole };
