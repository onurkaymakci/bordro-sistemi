const router = require('express').Router();
const { login, me, registerCompany } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');

router.post('/register-company', registerCompany); // Yeni sirket + Anahtar Kullanici kaydi
router.post('/login', login);
router.get('/me', authenticate, me);

module.exports = router;
