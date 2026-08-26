const router = require('express').Router();
const ctrl = require('../controllers/report.controller');
const { authenticate, authorize, scopeToCompany } = require('../middleware/auth');

router.use(authenticate, scopeToCompany, authorize('SYSTEM_ADMIN', 'KEY_USER', 'HR_SPECIALIST', 'MANAGER'));

router.get('/active-employees', ctrl.activeEmployees);
router.get('/by-department', ctrl.employeesByDepartment);
router.get('/hires-terminations', ctrl.hiresAndTerminations);
router.get('/leave-summary', ctrl.leaveSummary);

module.exports = router;
