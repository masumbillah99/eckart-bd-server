const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
// const jwt = require("jsonwebtoken");
// const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
// const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;

// MIDDLEWARE
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("College booking server is sitting");
});

app.listen(port, () => {
  console.log(`College booking server is on port ${port}`);
});
