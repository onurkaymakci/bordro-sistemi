const router = require('express').Router();
const ctrl = require('../controllers/user.controller');
const { authenticate, authorize, scopeToCompany } = require('../middleware/auth');

router.use(authenticate, scopeToCompany, authorize('SYSTEM_ADMIN', 'KEY_USER'));

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.post('/:id/deactivate', ctrl.deactivate);
router.put('/:id/role', ctrl.updateRole);

module.exports = router;
