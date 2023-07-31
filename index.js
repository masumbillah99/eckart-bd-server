const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;

// MIDDLEWARE
app.use(cors());
app.use(express.json());

// json data
const collegeData = require("./jsonData/college-data.json");
const reviewsData = require("./jsonData/reviews.json");

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.og57wk2.mongodb.net/?retryWrites=true&w=majority`;

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
    /** data collection */
    const reviewCollection = client
      .db("collegeBookingCommerce")
      .collection("reviewsData");
    const collegeCollection = client
      .db("collegeBookingCommerce")
      .collection("collegesData");
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    /** implement search system */
    // creating index on two fields
    const indexKeys = { college_name: 1 };
    const indexOptions = { name: "collegeName" };
    const result = await collegeCollection.createIndex(indexKeys, indexOptions);

    app.get("/searchCollege/:text", async (req, res) => {
      const searchText = req.params.text;
      const result = await collegeCollection
        .find({
          $or: [{ college_name: { $regex: searchText, $options: "i" } }],
        })
        .toArray();
      res.send(result);
    });

    /**  college data route api */
    app.get("/colleges", async (req, res) => {
      const result = await collegeCollection.find().toArray();
      res.send(result);
    });

    app.get("/colleges/:id", async (req, res) => {
      const filter = { _id: new ObjectId(req.params.id) };
      const result = await collegeCollection.findOne(filter);
      res.send(result);
    });

    /** reviews data route api */
    app.get("/reviews", async (req, res) => {
      const result = await reviewCollection.find().toArray();
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
  res.send("College booking server is sitting");
});

app.listen(port, () => {
  console.log(`College booking server is on port ${port}`);
});
