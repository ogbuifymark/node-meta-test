const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../server");

test("GET /health returns ok", async () => {
  const response = await request(app).get("/health");
  assert.equal(response.status, 200);
  assert.equal(response.body.status, "ok");
});

test("GET /api/v1/nfts returns seed data", async () => {
  const response = await request(app).get("/api/v1/nfts");
  assert.equal(response.status, 200);
  assert.equal(response.body.nfts.length, 10);
});

// --- Core (must implement for 60-min assessment) ---
test("should return 404 for nonexistent NFT history", async () => {
  // TODO: Candidate implements
});

test("should return 400 for bid lower than current highest", async () => {
  // TODO: Candidate implements
});

test("GET /api/v1/transactions/user/:address returns paginated data", async () => {
  // TODO: Candidate implements
});

// --- Optional ---
test("should handle malformed request body gracefully", async () => {
  // TODO: Candidate implements (nice-to-have)
});
