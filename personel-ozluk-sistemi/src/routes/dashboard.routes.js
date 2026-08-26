const router = require('express').Router();
const ctrl = require('../controllers/dashboard.controller');
const { authenticate, scopeToCompany } = require('../middleware/auth');

router.use(authenticate, scopeToCompany);
router.get('/summary', ctrl.summary);

module.exports = router;
