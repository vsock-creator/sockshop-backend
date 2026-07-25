const express = require("express");
const { MongoClient } = require("mongodb");
const crypto = require("crypto");
const tls = require("tls");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const API_SECRET = process.env.API_SECRET;

let db;

const secureContext = tls.createSecureContext({
	secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
});

const client = new MongoClient(MONGO_URI, {
	family: 4,
	secureContext: secureContext,
});

client.connect()
	.then(() => {
		db = client.db("SockShop");
		console.log("Connected to MongoDB");
	})
	.catch((err) => {
		console.error("MongoDB connection failed:", err);
	});

function checkAuth(req, res, next) {
	const providedSecret = req.headers["x-api-secret"];
	if (providedSecret !== API_SECRET) {
		return res.status(401).json({ error: "Unauthorized" });
	}
	next();
}

app.get("/player/:userId", checkAuth, async (req, res) => {
	try {
		const userId = req.params.userId;
		const doc = await db.collection("players").findOne({ userId: userId });

		if (!doc) {
			return res.json({
				Currency: 0,
				Kills: 0,
				Inventory: {},
				EquippedSkin: "none",
				EquippedEffect: "none",
			});
		}

		delete doc._id;
		res.json(doc);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Server error" });
	}
});

app.post("/player/:userId", checkAuth, async (req, res) => {
	try {
		const userId = req.params.userId;
		const data = req.body;

		await db.collection("players").updateOne(
			{ userId: userId },
			{ $set: { ...data, userId: userId } },
			{ upsert: true }
		);

		res.json({ success: true });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Server error" });
	}
});

app.get("/", (req, res) => {
	res.send("SockShop backend is running.");
});

app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});