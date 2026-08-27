const router = require('express').Router();
const ctrl = require('../controllers/document.controller');
const { authenticate, authorize, scopeToCompany } = require('../middleware/auth');
const upload = require('../config/upload');

router.use(authenticate, scopeToCompany);

router.post(
  '/',
  authorize('SYSTEM_ADMIN', 'KEY_USER', 'HR_SPECIALIST'),
  upload.single('file'),
  ctrl.upload
);
router.get('/missing-report', authorize('SYSTEM_ADMIN', 'KEY_USER', 'HR_SPECIALIST'), ctrl.missingDocumentsReport);
router.get('/me', ctrl.listMine);
router.get('/employee/:employeeId', ctrl.listByEmployee);
router.get('/:id/file', ctrl.viewFile);
router.get('/:id/download', ctrl.downloadFile);
router.delete('/:id', authorize('SYSTEM_ADMIN', 'KEY_USER', 'HR_SPECIALIST'), ctrl.remove);

module.exports = router;
