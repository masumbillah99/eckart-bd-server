const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.og57wk2.mongodb.net/?retryWrites=true&w=majority`;

// MIDDLEWARE
app.use(cors());
app.use(express.json());

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const usersCollection = client.db(process.env.DB_USER).collection("users");
    const productsCollection = client
      .db(process.env.DB_USER)
      .collection("all-products");
    const categoryCollection = client
      .db(process.env.DB_USER)
      .collection("product-category");

    // get user role form db
    app.get("/users-role/:email", async (req, res) => {
      const query = { email: req.params.email };
      if (!query) {
        return res.status(403).send({ error: true, message: "No user found" });
      }
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    // save user email and role in db
    app.put("/set-users/:email", async (req, res) => {
      const user = req.body;
      const query = { email: req.params.email };
      const updateDoc = { $set: user };
      const options = { upsert: true };
      const result = await usersCollection.updateOne(query, updateDoc, options);
      res.send(result);
    });

    /** -------- product apis --------- */
    app.get("/product-categories", async (req, res) => {
      const result = await categoryCollection.find().toArray({});
      if (!result) {
        return res.send({
          error: true,
          message: "Product categories not found",
        });
      }
      res.send(result);
    });

    // add-product in db
    app.post("/add-product", async (req, res) => {
      const productData = req.body;
      const result = await productsCollection.insertOne(productData);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hat Bazar Server is sitting");
});

app.listen(port, () => {
  console.log(`Hat-Bazar Server is on port: ${port}`);
});
