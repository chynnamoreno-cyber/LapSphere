const requiredKeys = ["CONNECTION_STRING", "JWT_SECRET"];

const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  apiPrefix: process.env.API_PREFIX || "/api/v1",
  connectionString: process.env.CONNECTION_STRING || "",
  dbName: process.env.DB_NAME || "ITCP_database",
  jwtSecret: process.env.JWT_SECRET || "",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  corsOrigin: process.env.CORS_ORIGIN || "*",
  uploadDir: process.env.UPLOAD_DIR || "uploads",
  maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB || 5),
  fcmServiceAccountPath: process.env.FCM_SERVICE_ACCOUNT_PATH || "",
};

const missing = requiredKeys.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.warn(`[config] Missing env key(s): ${missing.join(", ")}`);
}

module.exports = config;
