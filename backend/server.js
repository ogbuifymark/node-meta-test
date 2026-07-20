const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const dotenv = require("dotenv");
const { baseNfts, baseTransactions } = require("./data/seedData");

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;
const corsOrigin = process.env.CORS_ORIGIN || "*";

app.use(morgan("dev"));
app.use(express.json());
app.use(
  cors({
    origin: corsOrigin === "*" ? true : corsOrigin,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Origin", "Content-Type", "Accept", "Authorization"],
  })
);

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function findNft(id) {
  return baseNfts.find((nft) => nft.id === id);
}

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    message: "NodeMeta Marketplace API is running",
    version: "1.0.0",
    chain: "BNB Smart Chain Testnet",
  });
});

app.get("/api/v1/nfts", (req, res) => {
  const page = Number.parseInt(req.query.page || "1", 10);
  const limit = Number.parseInt(req.query.limit || "10", 10);
  res.json({
    nfts: baseNfts.map(({ history, ...nft }) => nft),
    total: baseNfts.length,
    page,
    limit,
    totalPages: 1,
  });
});

app.get("/api/v1/nfts/marketplace/listings", (_req, res) => {
  res.json(baseNfts.filter((nft) => nft.isListed).map(({ history, ...nft }) => nft));
});

app.get("/api/v1/nfts/:id/metadata", (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ error: true, message: "Invalid NFT ID" });
  }
  const nft = findNft(id);
  if (!nft) {
    return res.status(404).json({ error: true, message: "NFT not found" });
  }
  return res.json({
    name: nft.name,
    description: nft.description,
    image: nft.imageUrl,
    external_url: `https://nodemeta.com/nft/${id}`,
    attributes: [
      { trait_type: "Rarity", value: "Legendary" },
      { trait_type: "Chain", value: "BSC Testnet" },
      { trait_type: "Collection", value: "NodeMeta" },
    ],
  });
});

app.get("/api/v1/nfts/:id", (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ error: true, message: "Invalid NFT ID" });
  }
  const nft = findNft(id);
  if (!nft) {
    return res.status(404).json({ error: true, message: "NFT not found" });
  }
  const { history, ...publicNft } = nft;
  return res.json(publicNft);
});

app.get("/api/v1/nfts/:id/history", (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: true, message: "Invalid NFT ID" });

  const nft = findNft(id);
  if (!nft) return res.status(404).json({ error: true, message: "NFT not found" });

  // sort newest first by timestamp
  var history = nft.history.slice();
  history.sort(function (a, b) {
    return b.timestamp - a.timestamp;
  });
  return res.json({ history: history });
});

// Place a bid on an NFT
app.post("/api/v1/nfts/:id/bid", (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: true, message: "Invalid NFT ID" });

  const nft = findNft(id);
  if (!nft) return res.status(404).json({ error: true, message: "NFT not found" });

  const bidder = req.body && req.body.bidder;
  const amount = req.body && req.body.amount;
  if (!bidder || !amount) {
    return res.status(400).json({ error: true, message: "Missing bidder or amount" });
  }

  const bidAmount = parseFloat(amount);
  if (isNaN(bidAmount) || bidAmount <= 0) {
    return res.status(400).json({ error: true, message: "Invalid bid amount" });
  }

  // use listing price as floor, or highest existing bid
  let currentHighest = parseFloat(nft.price);
  if (nft.bids && nft.bids.length > 0) {
    for (let i = 0; i < nft.bids.length; i++) {
      const b = parseFloat(nft.bids[i].amount);
      if (b > currentHighest) currentHighest = b;
    }
  }

  if (bidAmount <= currentHighest) {
    return res.status(400).json({
      error: true,
      message: "Bid too low, must be higher than " + currentHighest,
    });
  }

  // record the bid
  if (!nft.bids) nft.bids = [];
  nft.bids.push({ bidder: bidder, amount: amount, timestamp: Date.now() });

  // return nft without history (same pattern as GET /nfts/:id)
  const resp = Object.assign({}, nft);
  delete resp.history;
  return res.json(resp);
});

// User transactions with pagination
app.get("/api/v1/transactions/user/:address", (req, res) => {
  const addr = req.params.address.toLowerCase();
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const userTxs = baseTransactions.filter(
    (tx) => tx.from.toLowerCase() === addr || tx.to.toLowerCase() === addr
  );

  const start = (page - 1) * limit;
  const paged = userTxs.slice(start, start + limit);

  return res.json({
    transactions: paged,
    total: userTxs.length,
    page: page,
    limit: limit,
    totalPages: Math.ceil(userTxs.length / limit) || 1,
  });
});

app.get("/api/v1/transactions", (req, res) => {
  const page = Number.parseInt(req.query.page || "1", 10);
  const limit = Number.parseInt(req.query.limit || "10", 10);
  return res.json({
    transactions: baseTransactions,
    total: baseTransactions.length,
    page,
    limit,
    totalPages: 1,
  });
});

app.get("/api/v1/transactions/:id", (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ error: true, message: "Invalid transaction ID" });
  }
  const transaction = baseTransactions.find((tx) => tx.id === id);
  if (!transaction) {
    return res.status(404).json({ error: true, message: "Transaction not found" });
  }
  return res.json(transaction);
});

app.use((err, _req, res, _next) => {
  res.status(err.status || 500).json({
    error: true,
    message: err.message || "Internal server error",
  });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`🚀 NodeMeta backend starting on port ${port}`);
  });
}

module.exports = app;
