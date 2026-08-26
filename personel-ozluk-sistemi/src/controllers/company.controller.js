const { z } = require('zod');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');

// PRD 10.12 Sirket Ayarlari Ekrani
async function getMyCompany(req, res) {
  const company = await prisma.company.findUnique({
    where: { id: req.companyId },
    include: { mandatoryDocs: true, departments: true },
  });
  if (!company) throw new ApiError(404, 'Sirket bulunamadi.');
  res.json({ success: true, data: company });
}

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  taxNumber: z.string().optional(),
  mersisNo: z.string().optional(),
  address: z.string().optional(),
});

async function updateMyCompany(req, res) {
  const data = updateSchema.parse(req.body);
  const company = await prisma.company.update({
    where: { id: req.companyId },
    data,
  });
  res.json({ success: true, data: company });
}

// PRD 10.12 - Zorunlu Evrak Tanimlari
const mandatoryDocSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  isRequired: z.boolean().optional(),
  validityDays: z.number().int().positive().optional(),
});

async function addMandatoryDocument(req, res) {
  const data = mandatoryDocSchema.parse(req.body);
  const doc = await prisma.mandatoryDocumentType.create({
    data: { ...data, companyId: req.companyId },
  });
  res.status(201).json({ success: true, data: doc });
}

async function listMandatoryDocuments(req, res) {
  const docs = await prisma.mandatoryDocumentType.findMany({ where: { companyId: req.companyId } });
  res.json({ success: true, data: docs });
}

// Departman/Organizasyon Yapisi - PRD Bolum 10.7
const departmentSchema = z.object({
  name: z.string().min(1),
  parentId: z.string().uuid().optional(),
});

async function createDepartment(req, res) {
  const data = departmentSchema.parse(req.body);
  const department = await prisma.department.create({
    data: { ...data, companyId: req.companyId },
  });
  res.status(201).json({ success: true, data: department });
}

async function listDepartments(req, res) {
  const departments = await prisma.department.findMany({
    where: { companyId: req.companyId },
    include: { children: true },
  });
  res.json({ success: true, data: departments });
}

module.exports = {
  getMyCompany,
  updateMyCompany,
  addMandatoryDocument,
  listMandatoryDocuments,
  createDepartment,
  listDepartments,
};
