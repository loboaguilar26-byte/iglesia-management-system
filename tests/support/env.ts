import "dotenv/config";

// Las pruebas nunca usan la base de desarrollo.
const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) throw new Error("Define TEST_DATABASE_URL para ejecutar las pruebas.");
process.env.DATABASE_URL = testUrl;
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
process.env.BETTER_AUTH_SECRET ??= "test-secret-solo-para-pruebas-0123456789";
