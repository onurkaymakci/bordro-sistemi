const router = require('express').Router();
const ctrl = require('../controllers/leave.controller');
const { authenticate, authorize, scopeToCompany } = require('../middleware/auth');

router.use(authenticate, scopeToCompany);

router.get('/', ctrl.list);
router.post('/', ctrl.create); // Calisan kendi izin talebini olusturabilir
router.post('/:id/decision', authorize('SYSTEM_ADMIN', 'KEY_USER', 'HR_SPECIALIST', 'MANAGER'), ctrl.decide);
router.post('/:id/cancel', ctrl.cancel);

module.exports = router;
