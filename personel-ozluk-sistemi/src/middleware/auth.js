const { verifyToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');

/**
 * Authorization: Bearer <token> basligini dogrular.
 * Token gecerliyse req.user = { id, companyId, role, email } atanir.
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new ApiError(401, 'Yetkilendirme basligi eksik veya hatali.');
  }

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (err) {
    throw new ApiError(401, 'Gecersiz veya suresi dolmus token.');
  }
}

/**
 * Belirtilen rollerden birine sahip olmayan kullanicilari reddeder.
 * Kullanim: authorize('SYSTEM_ADMIN', 'KEY_USER')
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, 'Once kimlik dogrulamasi yapilmalidir.');
    }
    if (!allowedRoles.includes(req.user.role)) {
      throw new ApiError(403, 'Bu islemi yapmak icin yetkiniz yok.');
    }
    next();
  };
}

/**
 * SYSTEM_ADMIN haricindeki her kullanicinin sadece kendi sirketinin
 * verilerine erisebilmesini saglar. req.companyId olarak set eder.
 */
function scopeToCompany(req, res, next) {
  if (req.user.role === 'SYSTEM_ADMIN') {
    // Sistem yöneticisi query/body ile companyId belirtebilir.
    // Belirtmezse kendi companyId'sini kullanır.
    req.companyId = req.query.companyId || req.body.companyId || req.user.companyId || null;
  } else {
    if (!req.user.companyId) {
      throw new ApiError(403, 'Kullanici herhangi bir sirkete bagli degil.');
    }
    req.companyId = req.user.companyId;
  }
  next();
}

module.exports = { authenticate, authorize, scopeToCompany };
