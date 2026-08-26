// Tum hatalarin tek noktadan, tutarli bir JSON formatinda donmesini saglar.
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Sunucu hatasi olustu.';

  if (statusCode === 500) {
    // Beklenmeyen hatalari loglayalim
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

module.exports = errorHandler;
