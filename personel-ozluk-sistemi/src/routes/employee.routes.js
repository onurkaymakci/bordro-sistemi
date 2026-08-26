const router = require('express').Router();
const multer = require('multer');

const ctrl = require('../controllers/employee.controller');

const {
  authenticate,
  authorize,
  scopeToCompany
} = require('../middleware/auth');


/* ============================================================
   MULTER - PERSONEL EXCEL IMPORT
============================================================ */

const upload = multer({

  storage:
    multer.memoryStorage(),

  limits: {
    fileSize:
      10 * 1024 * 1024
  },

  fileFilter: (
    req,
    file,
    cb
  ) => {

    const fileName =
      String(
        file.originalname || ''
      ).toLowerCase();


    const validExtension =
      fileName.endsWith('.xlsx') ||
      fileName.endsWith('.xls');


    if (validExtension) {

      return cb(
        null,
        true
      );

    }


    return cb(
      new Error(
        'Yalnızca Excel dosyaları (.xlsx veya .xls) yüklenebilir.'
      )
    );

  }

});


/* ============================================================
   AUTH
============================================================ */

router.use(
  authenticate,
  scopeToCompany
);


/* ============================================================
   PERSONEL LİSTESİ
============================================================ */

router.get(
  '/',
  authorize(
    'SYSTEM_ADMIN',
    'KEY_USER',
    'HR_SPECIALIST',
    'MANAGER'
  ),
  ctrl.list
);


/* ============================================================
   PERSONEL IMPORT - ÖN KONTROL
============================================================ */

router.post(
  '/import/preview',
  authorize(
    'SYSTEM_ADMIN',
    'KEY_USER',
    'HR_SPECIALIST'
  ),

  upload.single('file'),

  ctrl.previewImport
);


/* ============================================================
   PERSONEL IMPORT - ONAY / KAYIT
============================================================ */

router.post(
  '/import/confirm',
  authorize(
    'SYSTEM_ADMIN',
    'KEY_USER',
    'HR_SPECIALIST'
  ),
  ctrl.confirmImport
);


/* ============================================================
   TEKLİ PERSONEL OLUŞTURMA
============================================================ */

router.post(
  '/',
  authorize(
    'SYSTEM_ADMIN',
    'KEY_USER',
    'HR_SPECIALIST'
  ),
  ctrl.create
);


/* ============================================================
   PERSONEL DETAY
============================================================ */

/*
 * ÖNEMLİ:
 * /:id mutlaka /import/... route'larından sonra gelmeli.
 */

router.get(
  '/:id',
  ctrl.getById
);


/* ============================================================
   PERSONEL GÜNCELLEME
============================================================ */

router.put(
  '/:id',
  authorize(
    'SYSTEM_ADMIN',
    'KEY_USER',
    'HR_SPECIALIST'
  ),
  ctrl.update
);


/* ============================================================
   PERSONEL PASİFE ALMA
============================================================ */

router.post(
  '/:id/deactivate',
  authorize(
    'SYSTEM_ADMIN',
    'KEY_USER',
    'HR_SPECIALIST'
  ),
  ctrl.deactivate
);


/* ============================================================
   EXPORT
============================================================ */

module.exports = router;