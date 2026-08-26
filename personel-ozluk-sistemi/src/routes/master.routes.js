const router = require('express').Router();

const ctrl = require('../controllers/master.controller');

const {
  authenticate,
  scopeToCompany,
} = require('../middleware/auth');


// Tum master endpoint'leri login gerektirir
router.use(
  authenticate,
  scopeToCompany
);


// Bankalar
router.get(
  '/banks',
  ctrl.listBanks
);


// Meslek kodlari
router.get(
  '/occupations',
  ctrl.listOccupations
);


// SGK belge turleri
router.get(
  '/sgk-document-types',
  ctrl.listSgkDocumentTypes
);


// Tesvik / Kanun No
router.get(
  '/incentives',
  ctrl.listIncentives
);


// SGK isten cikis kodlari
router.get(
  '/termination-reasons',
  ctrl.listTerminationReasons
);


module.exports = router;