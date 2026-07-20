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

// --- Core ---
test("should return 404 for nonexistent NFT history", async () => {
  const res = await request(app).get("/api/v1/nfts/9999/history");
  assert.equal(res.status, 404);
});

test("history comes back sorted newest first", async () => {
  const res = await request(app).get("/api/v1/nfts/1/history");
  assert.equal(res.status, 200);
  const timestamps = res.body.history.map(h => h.timestamp);
  // first should be the biggest timestamp
  assert.equal(timestamps[0], Math.max(...timestamps));
});

test("should return 400 for bid lower than current highest", async () => {
  // nft 1 has price 0.01, so bidding 0.001 should fail
  const res = await request(app)
    .post("/api/v1/nfts/1/bid")
    .send({ bidder: "0xabc", amount: "0.001" });
  assert.equal(res.status, 400);
});

test("valid bid gets accepted", async () => {
  const res = await request(app)
    .post("/api/v1/nfts/2/bid")
    .send({ bidder: "0xabc", amount: "5" });
  assert.equal(res.status, 200);
  assert.ok(res.body.bids.length >= 1);
});

test("user transactions returns array", async () => {
  // OWNER address from seedData
  const res = await request(app)
    .get("/api/v1/transactions/user/0xEA454CBA3F72d0bc966C80875053fd8cb26ae80B");
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.transactions));
  assert.ok(res.body.transactions.length > 0);
});

test("unknown address returns empty array not 404", async () => {
  const res = await request(app).get("/api/v1/transactions/user/0xdeadbeef");
  assert.equal(res.status, 200);
  assert.equal(res.body.transactions.length, 0);
});

// --- Optional ---
test("should handle malformed request body gracefully", async () => {
  const res = await request(app)
    .post("/api/v1/nfts/1/bid")
    .send({});
  assert.equal(res.status, 400);
});
