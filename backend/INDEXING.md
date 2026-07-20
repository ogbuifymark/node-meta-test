## How I'd add indexing later

Everything is just arrays in memory right now so it scans the whole list every time. If this needed to scale I'd swap it out for Postgres, add indexes on the `from` and `to` columns in the transactions table so user lookups are fast, and keep bids in their own table indexed by `nft_id` and `amount` so grabbing the highest bid is just a simple query. For pagination I'd use cursor-based queries on `timestamp` instead of doing `.slice()` in JS.
