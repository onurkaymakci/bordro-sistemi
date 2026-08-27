const { z } = require('zod');
const fs = require('fs');
const path = require('path');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const {
  assertEmployeeAccess,
  resolveCurrentEmployee,
} = require('../policies/employee-object-access.policy');

const optionalMultipartDate = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z.coerce.date().optional()
);

const documentTypeSchema = z.object({
  employeeId: z.string().uuid(),
  type: z.string().min(1),
  issueDate: optionalMultipartDate,
  expiryDate: optionalMultipartDate,
}).refine(
  ({ issueDate, expiryDate }) => !issueDate || !expiryDate || expiryDate >= issueDate,
  { message: 'Gecerlilik tarihi duzenlenme tarihinden once olamaz.', path: ['expiryDate'] }
);

function serializeDocument(document) {
  const { filePath, ...safeDocument } = document;
  return safeDocument;
}

async function removeUploadedFile(file) {
  if (!file || !file.path) return;
  await fs.promises.unlink(file.path).catch(() => {});
}

async function assertEmployeeInCompany(employeeId, companyId) {
  const employee = await prisma.employee.findFirst({ where: { id: employeeId, companyId } });
  if (!employee) throw new ApiError(404, 'Personel bulunamadi.');
  return employee;
}

async function upload(req, res) {
  if (!req.file) throw new ApiError(400, 'Dosya yuklenmedi.');

  try {
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

    res.status(201).json({ success: true, data: serializeDocument(document) });
  } catch (error) {
    await removeUploadedFile(req.file);
    if (error instanceof z.ZodError) {
      throw new ApiError(400, error.issues[0]?.message || 'Evrak bilgileri gecersiz.');
    }
    throw error;
  }
}

async function getDocuments(employeeId) {
  const documents = await prisma.employeeDocument.findMany({
    where: { employeeId },
    orderBy: { createdAt: 'desc' },
  });
  return documents.map(serializeDocument);
}

async function listByEmployee(req, res) {
  await assertEmployeeAccess(req, req.params.employeeId);
  await assertEmployeeInCompany(req.params.employeeId, req.companyId);
  res.json({ success: true, data: await getDocuments(req.params.employeeId) });
}

async function listMine(req, res) {
  const employee = await resolveCurrentEmployee(req);
  res.json({ success: true, data: await getDocuments(employee.id) });
}

async function findAccessibleDocument(req) {
  const document = await prisma.employeeDocument.findFirst({
    where: {
      id: req.params.id,
      employee: { companyId: req.companyId },
    },
  });
  if (!document) throw new ApiError(404, 'Evrak bulunamadi.');

  await assertEmployeeAccess(req, document.employeeId);
  return document;
}

async function resolveStoredFile(document) {
  try {
    const configuredRoot = path.resolve(process.env.UPLOAD_DIR || 'uploads');
    const uploadRoot = await fs.promises.realpath(configuredRoot);
    const requestedPath = path.resolve(document.filePath);
    const filePath = await fs.promises.realpath(requestedPath);
    const relativePath = path.relative(uploadRoot, filePath);
    if (relativePath === '..' || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
      throw new Error('outside upload root');
    }
    const stat = await fs.promises.stat(filePath);
    if (!stat.isFile()) throw new Error('not a file');
    return filePath;
  } catch (_error) {
    throw new ApiError(404, 'Evrak dosyasi bulunamadi.');
  }
}

async function viewFile(req, res) {
  const document = await findAccessibleDocument(req);
  const filePath = await resolveStoredFile(document);
  res.type(document.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(document.fileName)}`);
  res.sendFile(filePath);
}

async function downloadFile(req, res) {
  const document = await findAccessibleDocument(req);
  const filePath = await resolveStoredFile(document);
  res.download(filePath, document.fileName);
}

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
      if (!doc) missing.push(docType.name);
      else if (doc.expiryDate && doc.expiryDate < today) expired.push(docType.name);
    }
    return { employeeId: emp.id, fullName: emp.fullName, missing, expired };
  }).filter((item) => item.missing.length || item.expired.length);
  res.json({ success: true, data: report });
}

async function remove(req, res) {
  const document = await findAccessibleDocument(req);
  const filePath = await resolveStoredFile(document);
  await prisma.employeeDocument.delete({ where: { id: document.id } });
  await fs.promises.unlink(filePath).catch(() => {});
  res.json({ success: true, data: { id: document.id } });
}

module.exports = {
  upload,
  listByEmployee,
  listMine,
  viewFile,
  downloadFile,
  missingDocumentsReport,
  remove,
  serializeDocument,
};
