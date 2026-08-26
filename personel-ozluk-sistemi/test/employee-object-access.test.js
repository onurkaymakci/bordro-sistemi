process.env.JWT_SECRET = 'test-only-secret';

const prisma = require('../src/config/prisma');

jest.mock('../src/config/prisma', () => ({
  employee: {
    findFirst: jest.fn(),
  },
  employeeDocument: {
    findMany: jest.fn(),
  },
  leaveRequest: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');

const COMPANY_A = '10000000-0000-4000-8000-000000000001';
const COMPANY_B = '20000000-0000-4000-8000-000000000002';
const USER_A = '30000000-0000-4000-8000-000000000003';
const EMPLOYEE_A = '40000000-0000-4000-8000-000000000004';
const EMPLOYEE_A2 = '50000000-0000-4000-8000-000000000005';
const EMPLOYEE_B = '60000000-0000-4000-8000-000000000006';
const LEAVE_A2 = '70000000-0000-4000-8000-000000000007';

function employeeToken(overrides = {}) {
  return jwt.sign(
    {
      id: USER_A,
      companyId: COMPANY_A,
      role: 'EMPLOYEE',
      email: 'employee-a@example.test',
      ...overrides,
    },
    process.env.JWT_SECRET
  );
}

function authenticated(method, url, token = employeeToken()) {
  return request(app)[method](url).set('Authorization', `Bearer ${token}`);
}

describe('EMPLOYEE nesne erisim politikasi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.employee.findFirst.mockResolvedValue({ id: EMPLOYEE_A });
  });

  test('A sirketindeki kullanici B sirketindeki personeli okuyamaz', async () => {
    const response = await authenticated('get', `/api/employees/${EMPLOYEE_B}`);

    expect(response.status).toBe(404);
    expect(prisma.employee.findFirst).toHaveBeenCalledTimes(1);
    expect(prisma.employee.findFirst).toHaveBeenCalledWith({
      where: { userId: USER_A, companyId: COMPANY_A },
      select: { id: true },
    });
  });

  test('calisan ayni sirketindeki baska calisani okuyamaz', async () => {
    const response = await authenticated('get', `/api/employees/${EMPLOYEE_A2}`);

    expect(response.status).toBe(404);
    expect(prisma.employee.findFirst).toHaveBeenCalledTimes(1);
  });

  test('calisan kendi personel kaydini okuyabilir', async () => {
    prisma.employee.findFirst
      .mockResolvedValueOnce({ id: EMPLOYEE_A })
      .mockResolvedValueOnce({ id: EMPLOYEE_A, companyId: COMPANY_A });

    const response = await authenticated('get', `/api/employees/${EMPLOYEE_A}`);

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(EMPLOYEE_A);
  });

  test('calisan baska calisan adina izin acamaz; istek kendi kaydina baglanir', async () => {
    prisma.employee.findFirst
      .mockResolvedValueOnce({ id: EMPLOYEE_A })
      .mockResolvedValueOnce({ id: EMPLOYEE_A });
    prisma.leaveRequest.create.mockImplementation(async ({ data }) => ({ id: LEAVE_A2, ...data }));

    const response = await authenticated('post', '/api/leaves').send({
      employeeId: EMPLOYEE_A2,
      type: 'ANNUAL',
      startDate: '2026-09-01',
      endDate: '2026-09-02',
    });

    expect(response.status).toBe(201);
    expect(prisma.leaveRequest.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ employeeId: EMPLOYEE_A }),
    });
    expect(prisma.leaveRequest.create.mock.calls[0][0].data.employeeId).not.toBe(EMPLOYEE_A2);
  });

  test('calisan kendi adina izin olusturabilir', async () => {
    prisma.employee.findFirst
      .mockResolvedValueOnce({ id: EMPLOYEE_A })
      .mockResolvedValueOnce({ id: EMPLOYEE_A });
    prisma.leaveRequest.create.mockImplementation(async ({ data }) => ({ id: LEAVE_A2, ...data }));

    const response = await authenticated('post', '/api/leaves').send({
      employeeId: EMPLOYEE_A,
      type: 'ANNUAL',
      startDate: '2026-09-01',
      endDate: '2026-09-02',
    });

    expect(response.status).toBe(201);
    expect(response.body.data.employeeId).toBe(EMPLOYEE_A);
  });

  test('calisan baska calisanin iznini iptal edemez', async () => {
    prisma.leaveRequest.findFirst.mockResolvedValue(null);

    const response = await authenticated('post', `/api/leaves/${LEAVE_A2}/cancel`);

    expect(response.status).toBe(404);
    expect(prisma.leaveRequest.findFirst).toHaveBeenCalledWith({
      where: {
        id: LEAVE_A2,
        employeeId: EMPLOYEE_A,
        employee: { companyId: COMPANY_A },
      },
    });
    expect(prisma.leaveRequest.update).not.toHaveBeenCalled();
  });

  test('calisan kendi bekleyen izin talebini iptal edebilir', async () => {
    prisma.leaveRequest.findFirst.mockResolvedValue({
      id: LEAVE_A2,
      employeeId: EMPLOYEE_A,
      status: 'PENDING',
    });
    prisma.leaveRequest.update.mockResolvedValue({ id: LEAVE_A2, status: 'CANCELLED' });

    const response = await authenticated('post', `/api/leaves/${LEAVE_A2}/cancel`);

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('CANCELLED');
    expect(prisma.leaveRequest.update).toHaveBeenCalledWith({
      where: { id: LEAVE_A2 },
      data: { status: 'CANCELLED' },
    });
  });

  test('calisan baska calisanin evrak listesini goremez', async () => {
    const response = await authenticated('get', `/api/documents/employee/${EMPLOYEE_A2}`);

    expect(response.status).toBe(404);
    expect(prisma.employeeDocument.findMany).not.toHaveBeenCalled();
  });

  test('calisan kendi evrak listesini gorebilir', async () => {
    prisma.employee.findFirst
      .mockResolvedValueOnce({ id: EMPLOYEE_A })
      .mockResolvedValueOnce({ id: EMPLOYEE_A, companyId: COMPANY_A });
    prisma.employeeDocument.findMany.mockResolvedValue([
      { id: '80000000-0000-4000-8000-000000000008', employeeId: EMPLOYEE_A },
    ]);

    const response = await authenticated('get', `/api/documents/employee/${EMPLOYEE_A}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].employeeId).toBe(EMPLOYEE_A);
  });

  test('HR_SPECIALIST icin mevcut sirket kapsamli personel akisi korunur', async () => {
    const hrToken = employeeToken({ role: 'HR_SPECIALIST' });
    prisma.employee.findFirst.mockResolvedValue({ id: EMPLOYEE_A2, companyId: COMPANY_A });

    const response = await authenticated('get', `/api/employees/${EMPLOYEE_A2}`, hrToken);

    expect(response.status).toBe(200);
    expect(prisma.employee.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: EMPLOYEE_A2, companyId: COMPANY_A },
      })
    );
  });

  test('farkli sirket kimligi policy sorgusuna tasinmaz', async () => {
    await authenticated('get', `/api/employees/${EMPLOYEE_B}`);

    expect(prisma.employee.findFirst).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ companyId: COMPANY_B }) })
    );
  });
});
