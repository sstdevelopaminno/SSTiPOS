process.env.PORT = process.env.PORT || "30000";
process.env.APP_SURFACE = process.env.APP_SURFACE || "it_admin";
process.env.NEXT_DEV_BUNDLER = process.env.NEXT_DEV_BUNDLER || "webpack";

console.log("[dev-it-support] SSTiPOS Support: http://localhost:30000/it-admin/login");

await import("./dev-safe.mjs");
