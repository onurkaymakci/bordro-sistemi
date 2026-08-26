const router = require('express').Router();

const ctrl = require('../controllers/system-parameter.controller');

const {
  authenticate,
  authorize,
  scopeToCompany,
} = require('../middleware/auth');


/* ============================================================
   SISTEM PARAMETRELERI

   Yalnizca SYSTEM_ADMIN erisebilir.
============================================================ */

router.use(
  authenticate,
  scopeToCompany,
  authorize('SYSTEM_ADMIN')
);


/* ============================================================
   DINAMIK ORGANIZASYON BIRIM TIPLERI
============================================================ */

// Listele
router.get(
  '/organization-unit-types',
  ctrl.listOrganizationUnitTypes
);

// Olustur
router.post(
  '/organization-unit-types',
  ctrl.createOrganizationUnitType
);

// Guncelle
router.put(
  '/organization-unit-types/:id',
  ctrl.updateOrganizationUnitType
);

// Pasife al
router.post(
  '/organization-unit-types/:id/deactivate',
  ctrl.deactivateOrganizationUnitType
);


/* ============================================================
   DINAMIK ORGANIZASYON BIRIMLERI
============================================================ */

// Agac endpoint'i :id route'undan once olmalidir.
router.get(
  '/organization-units/tree',
  ctrl.getOrganizationTree
);

// Listele
router.get(
  '/organization-units',
  ctrl.listOrganizationUnits
);

// Detay
router.get(
  '/organization-units/:id',
  ctrl.getOrganizationUnitById
);

// Olustur
router.post(
  '/organization-units',
  ctrl.createOrganizationUnit
);

// Guncelle
router.put(
  '/organization-units/:id',
  ctrl.updateOrganizationUnit
);

// Pasife al
router.post(
  '/organization-units/:id/deactivate',
  ctrl.deactivateOrganizationUnit
);


/* ============================================================
   GECIS SURECI - ESKI ORGANIZASYON API'LERI

   Mevcut system-parameters.html bozulmasin diye simdilik
   korunuyor. Yeni Organizasyon ekrani tamamlandiktan sonra
   ikinci asamada kaldirilacak.
============================================================ */


/* ============================================================
   GENEL MUDURLUK
============================================================ */

router.get(
  '/general-management',
  ctrl.getGeneralManagement
);

router.put(
  '/general-management',
  ctrl.updateGeneralManagement
);


/* ============================================================
   DIREKTORLUK
============================================================ */

router.get(
  '/directorates',
  ctrl.listDirectorates
);

router.get(
  '/directorates/:id',
  ctrl.getDirectorateById
);

router.post(
  '/directorates',
  ctrl.createDirectorate
);

router.put(
  '/directorates/:id',
  ctrl.updateDirectorate
);

router.post(
  '/directorates/:id/deactivate',
  ctrl.deactivateDirectorate
);


/* ============================================================
   MUDURLUK
============================================================ */

router.get(
  '/managements',
  ctrl.listManagements
);

router.get(
  '/managements/:id',
  ctrl.getManagementById
);

router.post(
  '/managements',
  ctrl.createManagement
);

router.put(
  '/managements/:id',
  ctrl.updateManagement
);

router.post(
  '/managements/:id/deactivate',
  ctrl.deactivateManagement
);


/* ============================================================
   BOLUM
============================================================ */

router.get(
  '/organization-departments',
  ctrl.listOrganizationDepartments
);

router.get(
  '/organization-departments/:id',
  ctrl.getOrganizationDepartmentById
);

router.post(
  '/organization-departments',
  ctrl.createOrganizationDepartment
);

router.put(
  '/organization-departments/:id',
  ctrl.updateOrganizationDepartment
);

router.post(
  '/organization-departments/:id/deactivate',
  ctrl.deactivateOrganizationDepartment
);


/* ============================================================
   POZISYON

   Pozisyon endpoint'leri bu asamada korunuyor.
   Bir sonraki adimda organizationUnitId merkezli hale getirilecek.
============================================================ */

router.get(
  '/positions',
  ctrl.listPositions
);

router.get(
  '/positions/:id',
  ctrl.getPositionById
);

router.post(
  '/positions',
  ctrl.createPosition
);

router.put(
  '/positions/:id',
  ctrl.updatePosition
);

router.post(
  '/positions/:id/deactivate',
  ctrl.deactivatePosition
);


module.exports = router;
