import rateLimit from "express-rate-limit";

const keyGenerator = (req, res) => {
  if (req.user && req.user.id) return String(req.user.id);
  return req.ip;
};

const rateLimitHandler = (req, res, next, options) => {
  return res.status(options.statusCode || 429).json({
    error: options.message || "Too many requests. Please try again later.",
  });
};

// Strict upload limiter
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,                   // 1 upload per hour
  message: "Too many uploads, try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: rateLimitHandler,
});

// Download limiter
export const downloadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  message: "Too many downloads from this IP, slow down.",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: rateLimitHandler,
});
