const prisma = require('../config/prisma');

// PRD 11.8 Temel Raporlar - Aktif calisan listesi
async function activeEmployees(req, res) {
  const employees = await prisma.employee.findMany({
    where: { companyId: req.companyId, status: 'ACTIVE' },
    include: { department: true },
    orderBy: { fullName: 'asc' },
  });
  res.json({ success: true, data: employees });
}

// Departman bazli calisan listesi
async function employeesByDepartment(req, res) {
  const departments = await prisma.department.findMany({
    where: { companyId: req.companyId },
    include: { employees: { select: { id: true, fullName: true, position: true, status: true } } },
  });
  res.json({ success: true, data: departments });
}

// Ise giris / cikis raporu (tarih araligina gore)
async function hiresAndTerminations(req, res) {
  const { from, to } = req.query;
  const dateFilter = {};
  if (from) dateFilter.gte = new Date(from);
  if (to) dateFilter.lte = new Date(to);

  const [hires, terminations] = await Promise.all([
    prisma.employee.findMany({
      where: { companyId: req.companyId, ...(from || to ? { hireDate: dateFilter } : {}) },
      select: { id: true, fullName: true, hireDate: true, department: { select: { name: true } } },
      orderBy: { hireDate: 'desc' },
    }),
    prisma.employee.findMany({
      where: {
        companyId: req.companyId,
        terminationDate: { not: null, ...(from || to ? dateFilter : {}) },
      },
      select: { id: true, fullName: true, terminationDate: true },
      orderBy: { terminationDate: 'desc' },
    }),
  ]);

  res.json({ success: true, data: { hires, terminations } });
}

// Izin raporlari: kullanilan / bekleyen / yillik izin bakiyeleri (basitlestirilmis)
async function leaveSummary(req, res) {
  const leaves = await prisma.leaveRequest.findMany({
    where: { employee: { companyId: req.companyId } },
    include: { employee: { select: { id: true, fullName: true } } },
  });

  const usedByEmployee = {};
  const pending = [];

  for (const l of leaves) {
    if (l.status === 'APPROVED' && l.type === 'ANNUAL') {
      usedByEmployee[l.employeeId] = (usedByEmployee[l.employeeId] || 0) + l.dayCount;
    }
    if (l.status === 'PENDING') pending.push(l);
  }

  res.json({
    success: true,
    data: {
      pendingCount: pending.length,
      pending,
      usedAnnualLeaveByEmployee: usedByEmployee,
    },
  });
}

module.exports = { activeEmployees, employeesByDepartment, hiresAndTerminations, leaveSummary };
