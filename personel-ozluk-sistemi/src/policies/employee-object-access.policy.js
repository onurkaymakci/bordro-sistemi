const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');

async function resolveCurrentEmployee(req) {
  const employee = await prisma.employee.findFirst({
    where: {
      userId: req.user.id,
      companyId: req.companyId,
    },
    select: { id: true },
  });

  if (!employee) {
    throw new ApiError(404, 'Personel bulunamadi.');
  }

  return employee;
}

async function assertEmployeeAccess(req, employeeId) {
  if (req.user.role !== 'EMPLOYEE') return;

  const currentEmployee = await resolveCurrentEmployee(req);
  if (currentEmployee.id !== employeeId) {
    throw new ApiError(404, 'Personel bulunamadi.');
  }
}

async function resolveLeaveEmployeeId(req, requestedEmployeeId) {
  if (req.user.role !== 'EMPLOYEE') return requestedEmployeeId;

  const currentEmployee = await resolveCurrentEmployee(req);
  return currentEmployee.id;
}

async function getLeaveAccessFilter(req) {
  if (req.user.role !== 'EMPLOYEE') {
    return { employee: { companyId: req.companyId } };
  }

  const currentEmployee = await resolveCurrentEmployee(req);
  return {
    employeeId: currentEmployee.id,
    employee: { companyId: req.companyId },
  };
}

module.exports = {
  assertEmployeeAccess,
  getLeaveAccessFilter,
  resolveCurrentEmployee,
  resolveLeaveEmployeeId,
};
