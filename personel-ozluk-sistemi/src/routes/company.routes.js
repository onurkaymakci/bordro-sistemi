const router = require('express').Router();
const ctrl = require('../controllers/company.controller');
const { authenticate, authorize, scopeToCompany } = require('../middleware/auth');

router.use(authenticate, scopeToCompany);

router.get('/me', ctrl.getMyCompany);
router.put('/me', authorize('SYSTEM_ADMIN', 'KEY_USER'), ctrl.updateMyCompany);

router.get('/mandatory-documents', ctrl.listMandatoryDocuments);
router.post('/mandatory-documents', authorize('SYSTEM_ADMIN', 'KEY_USER'), ctrl.addMandatoryDocument);

router.get('/departments', ctrl.listDepartments);
router.post('/departments', authorize('SYSTEM_ADMIN', 'KEY_USER', 'HR_SPECIALIST'), ctrl.createDepartment);

module.exports = router;
