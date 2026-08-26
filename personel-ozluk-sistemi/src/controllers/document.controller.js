const { z } = require('zod');
const fs = require('fs');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');

const documentTypeSchema = z.object({
  employeeId: z.string().uuid(),
  type: z.string().min(1), // Prisma enum DocumentType degeri
  issueDate: z.coerce.date().optional(),
  expiryDate: z.coerce.date().optional(),
});

async function assertEmployeeInCompany(employeeId, companyId) {
  const employee = await prisma.employee.findFirst({ where: { id: employeeId, companyId } });
  if (!employee) throw new ApiError(404, 'Personel bulunamadi.');
  return employee;
}

// PRD 11.4 - Dosya yukleme
async function upload(req, res) {
  if (!req.file) throw new ApiError(400, 'Dosya yuklenmedi.');

  const { employeeId, type, issueDate, expiryDate } = documentTypeSchema.parse(req.body);
  await assertEmployeeInCompany(employeeId, req.companyId);

  const document = await prisma.employeeDocument.create({
    data: {
      employeeId,
      type,
      issueDate,
      expiryDate,
      fileName: req.file.originalname,
      filePath: req.file.path,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      uploadedById: req.user.id,
    },
  });

  res.status(201).json({ success: true, data: document });
}

// PRD 11.4 - Evrak listeleme (personel bazli)
async function listByEmployee(req, res) {
  await assertEmployeeInCompany(req.params.employeeId, req.companyId);

  const documents = await prisma.employeeDocument.findMany({
    where: { employeeId: req.params.employeeId },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: documents });
}

// PRD 8.2 / 11.7 - Eksik Evrak Kontrolu
// Sirket icin tanimlanan zorunlu evrak turleri ile calisanin sahip oldugu
// evraklar karsilastirilir; eksik veya suresi dolmus olanlar raporlanir.
async function missingDocumentsReport(req, res) {
  const mandatoryTypes = await prisma.mandatoryDocumentType.findMany({
    where: { companyId: req.companyId, isRequired: true },
  });

  const employees = await prisma.employee.findMany({
    where: { companyId: req.companyId, status: { not: 'TERMINATED' } },
    include: { documents: true },
  });

  const today = new Date();

  const report = employees.map((emp) => {
    const missing = [];
    const expired = [];

    for (const docType of mandatoryTypes) {
      const doc = emp.documents.find((d) => d.type === docType.code);
      if (!doc) {
        missing.push(docType.name);
      } else if (doc.expiryDate && doc.expiryDate < today) {
        expired.push(docType.name);
      }
    }

    return { employeeId: emp.id, fullName: emp.fullName, missing, expired };
  }).filter((r) => r.missing.length > 0 || r.expired.length > 0);

  res.json({ success: true, data: report });
}

async function remove(req, res) {
  const document = await prisma.employeeDocument.findUnique({
    where: { id: req.params.id },
    include: { employee: true },
  });
  if (!document || document.employee.companyId !== req.companyId) {
    throw new ApiError(404, 'Evrak bulunamadi.');
  }

  await prisma.employeeDocument.delete({ where: { id: document.id } });
  fs.unlink(document.filePath, () => {}); // dosya sistemi hatasi kritik degil

  res.json({ success: true, data: { id: document.id } });
}

module.exports = { upload, listByEmployee, missingDocumentsReport, remove };
