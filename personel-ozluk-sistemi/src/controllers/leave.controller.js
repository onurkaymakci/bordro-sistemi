const { z } = require('zod');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const {
  getLeaveAccessFilter,
  resolveLeaveEmployeeId,
} = require('../policies/employee-object-access.policy');

const leaveSchema = z.object({
  employeeId: z.string().uuid(),
  type: z.enum(['ANNUAL', 'EXCUSE', 'SICK', 'UNPAID']),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  description: z.string().optional(),
});

function calcDayCount(start, end) {
  const ms = end.getTime() - start.getTime();
  return Math.max(Math.round(ms / (1000 * 60 * 60 * 24)) + 1, 0);
}

// PRD 11.5 - Izin Talebi Olustur
async function create(req, res) {
  const data = leaveSchema.parse(req.body);
  const employeeId = await resolveLeaveEmployeeId(req, data.employeeId);

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, companyId: req.companyId },
  });
  if (!employee) throw new ApiError(404, 'Personel bulunamadi.');

  if (data.endDate < data.startDate) {
    throw new ApiError(400, 'Bitis tarihi baslangic tarihinden once olamaz.');
  }

  const leave = await prisma.leaveRequest.create({
    data: {
      ...data,
      employeeId,
      dayCount: calcDayCount(data.startDate, data.endDate),
      status: 'PENDING',
    },
  });

  res.status(201).json({ success: true, data: leave });
}

// PRD 11.5 - Izin listeleme (sirket bazli, filtrelenebilir)
async function list(req, res) {
  const { status, employeeId } = req.query;

  const leaves = await prisma.leaveRequest.findMany({
    where: {
      employee: { companyId: req.companyId },
      ...(status && { status }),
      ...(employeeId && { employeeId }),
    },
    include: { employee: { select: { id: true, fullName: true, registryNo: true } } },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: leaves });
}

// PRD 10.6 / 11.6 - Izin Onay Sureci (Yonetici onaylar)
const decisionSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  decisionNote: z.string().optional(),
});

async function decide(req, res) {
  const { status, decisionNote } = decisionSchema.parse(req.body);

  const leave = await prisma.leaveRequest.findFirst({
    where: { id: req.params.id, employee: { companyId: req.companyId } },
  });
  if (!leave) throw new ApiError(404, 'Izin talebi bulunamadi.');
  if (leave.status !== 'PENDING') {
    throw new ApiError(400, 'Bu izin talebi zaten karara baglanmis.');
  }

  const updated = await prisma.leaveRequest.update({
    where: { id: leave.id },
    data: { status, decisionNote, approvedById: req.user.id },
  });

  res.json({ success: true, data: updated });
}

async function cancel(req, res) {
  const accessFilter = await getLeaveAccessFilter(req);
  const leave = await prisma.leaveRequest.findFirst({
    where: { id: req.params.id, ...accessFilter },
  });
  if (!leave) throw new ApiError(404, 'Izin talebi bulunamadi.');
  if (leave.status !== 'PENDING') {
    throw new ApiError(400, 'Sadece bekleyen izin talepleri iptal edilebilir.');
  }

  const updated = await prisma.leaveRequest.update({
    where: { id: leave.id },
    data: { status: 'CANCELLED' },
  });

  res.json({ success: true, data: updated });
}

module.exports = { create, list, decide, cancel };
