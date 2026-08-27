process.env.JWT_SECRET = 'test-only-secret';
const fs = require('fs');
const path = require('path');
const prisma = require('../src/config/prisma');

jest.mock('../src/config/prisma',
          () => ({
            employee : {findFirst : jest.fn(), findMany : jest.fn()},
            employeeDocument : {
              findMany : jest.fn(),
              findFirst : jest.fn(),
              create : jest.fn(),
              delete : jest.fn()
            },
            mandatoryDocumentType : {findMany : jest.fn()},
          }));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const COMPANY_A = '10000000-0000-4000-8000-000000000001';
const COMPANY_B = '20000000-0000-4000-8000-000000000002';
const USER = '30000000-0000-4000-8000-000000000003';
const EMP_A = '40000000-0000-4000-8000-000000000004';
const EMP_A2 = '50000000-0000-4000-8000-000000000005';
const DOC = '80000000-0000-4000-8000-000000000008';
const tempFiles = [];
let symlinkSupported = true;
try {
  const probeTarget = path.resolve('uploads', '.symlink-probe-target');
  const probeLink = path.resolve('uploads', '.symlink-probe-link');
  fs.writeFileSync(probeTarget, 'probe');
  fs.symlinkSync(probeTarget, probeLink);
  fs.rmSync(probeLink, {force : true});
  fs.rmSync(probeTarget, {force : true});
} catch (_error) {
  symlinkSupported = false;
}
function token(role = 'EMPLOYEE', companyId = COMPANY_A) {
  return jwt.sign({id : USER, role, companyId, email : 'x@test'},
                  process.env.JWT_SECRET)
}
function auth(method, url, role = 'EMPLOYEE', companyId = COMPANY_A) {
  return request(app)[method](url).set('Authorization',
                                       `Bearer ${token(role, companyId)}`)
}
function makeFile() {
  const p = path.resolve('uploads', `jest-${Date.now()}-${Math.random()}.pdf`);
  fs.writeFileSync(p, '%PDF test');
  tempFiles.push(p);
  return p
}
function document(overrides = {}) {
  return {
    id: DOC, employeeId: EMP_A, type: 'ID_COPY', fileName: 'kimlik.pdf',
        filePath: makeFile(), mimeType: 'application/pdf', fileSize: 9,
        createdAt: new Date(), ...overrides
  }
}

describe('Evrak yonetimi guvenligi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.employee.findFirst.mockResolvedValue(
        {id : EMP_A, companyId : COMPANY_A});
    prisma.employeeDocument.findMany.mockResolvedValue([])
  });
  afterEach(() => {
    while (tempFiles.length)
      fs.rmSync(tempFiles.pop(), {force : true})
  });
  test('EMPLOYEE /me ile kendi evraklarini filePath olmadan listeler',
       async () => {
         prisma.employeeDocument.findMany.mockResolvedValue([ document() ]);
         const r = await auth('get', '/api/documents/me');
         expect(r.status).toBe(200);
         expect(r.body.data[0].filePath).toBeUndefined();
         expect(prisma.employeeDocument.findMany)
             .toHaveBeenCalledWith(
                 expect.objectContaining({where : {employeeId : EMP_A}}))
       });
  test.each([ [ 'file', 'goruntuleyemez' ], [ 'download', 'indiremez' ] ])(
      'EMPLOYEE baska calisanin evrakini %s ile %s', async (endpoint) => {
        prisma.employeeDocument.findFirst.mockResolvedValue(
            document({employeeId : EMP_A2}));
        const r = await auth('get', `/api/documents/${DOC}/${endpoint}`);
        expect(r.status).toBe(404)
      });
  test('baska sirket evrakinin varligini sizdirmaz', async () => {
    prisma.employeeDocument.findFirst.mockResolvedValue(null);
    const r = await auth('get', `/api/documents/${DOC}/file`);
    expect(r.status).toBe(404);
    expect(prisma.employeeDocument.findFirst).toHaveBeenCalledWith({
      where : {id : DOC, employee : {companyId : COMPANY_A}}
    })
  });
  test('A sirketindeki kullanici B sirketine bagli gercek evraka erisemez',
       async () => {
         const companyBDocument =
             document({employee : {companyId : COMPANY_B}});
         prisma.employeeDocument.findFirst.mockImplementation(
             ({where}) => where.employee.companyId === COMPANY_B
                              ? companyBDocument
                              : null);
         const r = await auth('get', `/api/documents/${DOC}/file`,
                              'HR_SPECIALIST', COMPANY_A);
         expect(r.status).toBe(404);
         expect(prisma.employeeDocument.findFirst).toHaveBeenCalledWith({
           where : {id : DOC, employee : {companyId : COMPANY_A}}
         })
       });
  test.each([ 'HR_SPECIALIST', 'MANAGER' ])(
      '%s ayni sirket evrakini goruntuleyebilir ve indirebilir', async role => {
        const d = document();
        prisma.employeeDocument.findFirst.mockResolvedValue(d);
        const view = await auth('get', `/api/documents/${DOC}/file`, role);
        expect(view.status).toBe(200);
        expect(view.headers['content-disposition']).toContain('inline');
        const download =
            await auth('get', `/api/documents/${DOC}/download`, role);
        expect(download.status).toBe(200);
        expect(download.headers['content-disposition']).toContain('attachment')
      });
  test('EMPLOYEE yukleyemez ve silemez', async () => {
    expect((await auth('post', '/api/documents').field('employeeId', EMP_A))
               .status)
        .toBe(403);
    expect((await auth('delete', `/api/documents/${DOC}`)).status).toBe(403)
  });
  test('yukleme yanitinda filePath bulunmaz', async () => {
    prisma.employeeDocument.create.mockImplementation(
        ({data}) => ({id : DOC, ...data}));
    const r =
        await auth('post', '/api/documents', 'HR_SPECIALIST')
            .field('employeeId', EMP_A)
            .field('type', 'ID_COPY')
            .attach('file', Buffer.from('%PDF'),
                    {filename : 'kimlik.pdf', contentType : 'application/pdf'});
    expect(r.status).toBe(201);
    expect(r.body.data.filePath).toBeUndefined();
    const stored =
        prisma.employeeDocument.create.mock.calls[0][0].data.filePath;
    fs.rmSync(stored, {force : true})
  });
  test('bos tarih alanlariyla evrak yuklenebilir', async () => {
    prisma.employeeDocument.create.mockImplementation(
        ({data}) => ({id : DOC, ...data}));
    const r =
        await auth('post', '/api/documents', 'HR_SPECIALIST')
            .field('employeeId', EMP_A)
            .field('type', 'ID_COPY')
            .field('issueDate', '')
            .field('expiryDate', '')
            .attach(
                'file', Buffer.from('%PDF'),
                {filename : 'tarihsiz.pdf', contentType : 'application/pdf'});
    expect(r.status).toBe(201);
    expect(prisma.employeeDocument.create).toHaveBeenCalledWith({
      data : expect.objectContaining(
          {issueDate : undefined, expiryDate : undefined})
    });
    const stored =
        prisma.employeeDocument.create.mock.calls[0][0].data.filePath;
    fs.rmSync(stored, {force : true})
  });
  test('veritabani kaydi basarisizsa yuklenen dosyayi temizler', async () => {
    prisma.employeeDocument.create.mockRejectedValue(new Error('db'));
    const before = new Set(fs.readdirSync('uploads'));
    const r =
        await auth('post', '/api/documents', 'HR_SPECIALIST')
            .field('employeeId', EMP_A)
            .field('type', 'ID_COPY')
            .attach('file', Buffer.from('%PDF'),
                    {filename : 'orphan.pdf', contentType : 'application/pdf'});
    expect(r.status).toBe(500);
    expect(fs.readdirSync('uploads').filter(x => !before.has(x))).toEqual([])
  });
  test('diskte olmayan dosya kontrollu 404 doner', async () => {
    prisma.employeeDocument.findFirst.mockResolvedValue(
        document({filePath : path.resolve('uploads', 'yok.pdf')}));
    const r = await auth('get', `/api/documents/${DOC}/file`, 'HR_SPECIALIST');
    expect(r.status).toBe(404);
    expect(r.text).toMatch(/dosyasi bulunamadi/i)
  });
  test('yukleme dizini disindaki dosyaya erisilemez ve dosya silinemez',
       async () => {
         const outside = path.resolve('outside-document.pdf');
         fs.writeFileSync(outside, 'secret');
         tempFiles.push(outside);
         prisma.employeeDocument.findFirst.mockResolvedValue(
             document({filePath : outside}));
         expect(
             (await auth('get', `/api/documents/${DOC}/file`, 'HR_SPECIALIST'))
                 .status)
             .toBe(404);
         expect((await auth('get', `/api/documents/${DOC}/download`,
                            'HR_SPECIALIST'))
                    .status)
             .toBe(404);
         expect((await auth('delete', `/api/documents/${DOC}`, 'HR_SPECIALIST'))
                    .status)
             .toBe(404);
         expect(fs.existsSync(outside)).toBe(true);
         expect(prisma.employeeDocument.delete).not.toHaveBeenCalled()
       });
  (symlinkSupported ? test : test.skip)(
      'sembolik bag ile yukleme dizini disina cikilamaz', async () => {
        const outside = path.resolve('symlink-target.pdf');
        const link = path.resolve('uploads', 'symlink-document.pdf');
        fs.writeFileSync(outside, 'secret');
        fs.symlinkSync(outside, link);
        tempFiles.push(link, outside);
        prisma.employeeDocument.findFirst.mockResolvedValue(
            document({filePath : link}));
        expect(
            (await auth('get', `/api/documents/${DOC}/file`, 'HR_SPECIALIST'))
                .status)
            .toBe(404);
        expect((await auth('delete', `/api/documents/${DOC}`, 'HR_SPECIALIST'))
                   .status)
            .toBe(404);
        expect(fs.existsSync(outside)).toBe(true)
      });
  test(
      'gecerlilik tarihi duzenlenme tarihinden once olamaz ve dosya temizlenir',
      async () => {
        const before = new Set(fs.readdirSync('uploads'));
        const r =
            await auth('post', '/api/documents', 'HR_SPECIALIST')
                .field('employeeId', EMP_A)
                .field('type', 'ID_COPY')
                .field('issueDate', '2026-08-20')
                .field('expiryDate', '2026-08-19')
                .attach(
                    'file', Buffer.from('%PDF'),
                    {filename : 'date.pdf', contentType : 'application/pdf'});
        expect(r.status).toBe(400);
        expect(prisma.employeeDocument.create).not.toHaveBeenCalled();
        expect(fs.readdirSync('uploads').filter(x => !before.has(x)))
            .toEqual([])
      });
  test('/evrak dolu Evrak Yonetimi HTML sayfasi doner', async () => {
    const r = await request(app).get('/evrak');
    expect(r.status).toBe(200);
    expect(r.text).toContain('<h1>Evrak Yönetimi</h1>');
    expect(r.text.length).toBeGreaterThan(1000)
  });
});
