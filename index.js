const express = require("express");
const app = express();
const cors = require("cors");
const SSLCommerzPayment = require("sslcommerz-lts");
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
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

const store_id = process.env.SSL_STORE_ID;
const store_passwd = process.env.SSL_STORE_PASS;
const is_live = false; // true for live, false for sandbox

async function run() {
  try {
    const usersCollection = client.db(process.env.DB_USER).collection("users");
    const productsCollection = client
      .db(process.env.DB_USER)
      .collection("all-products");
    const categoryCollection = client
      .db(process.env.DB_USER)
      .collection("product-category");
    const ordersCollection = client
      .db(process.env.DB_USER)
      .collection("orders");

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

    /** ------------ payment apis ------------ */
    // payment with ssl-commerz
    app.post("/payment-request", async (req, res) => {
      const orderBody = req.body;
      const transactionId = new ObjectId().toString();
      // console.log(orderBody);

      const sslData = {
        total_amount: orderBody.totalPrice,
        currency: orderBody.currency,
        // use unique tran_id for each api call
        tran_id: transactionId,
        success_url: `${process.env.SERVER_URL}/payment-success/${transactionId}`,
        fail_url: `${process.env.SERVER_URL}/payment-failed/${transactionId}`,
        cancel_url: `${process.env.SERVER_URL}/payment-cancel`,
        ipn_url: "http://localhost:3030/ipn",
        shipping_method: "Courier",
        product_name: "Computer.",
        product_category: "Electronic",
        product_profile: "general",
        cus_name: orderBody.consumerInfo?.name,
        cus_email: orderBody.consumerInfo?.email,
        cus_add1: orderBody.consumerInfo?.address,
        cus_add2: "Dhaka",
        cus_city: "Dhaka",
        cus_state: "Dhaka",
        cus_postcode: "1000",
        cus_country: "Bangladesh",
        cus_phone: "01711111111",
        cus_fax: "01711111111",
        ship_name: "Customer Name",
        ship_add1: "Dhaka",
        ship_add2: "Dhaka",
        ship_city: "Dhaka",
        ship_state: "Dhaka",
        ship_postcode: 1000,
        ship_country: "Bangladesh",
      };

      // console.log(sslData);
      const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
      sslcz.init(sslData).then((apiResponse) => {
        // Redirect the user to payment gateway
        let GatewayPageURL = apiResponse.GatewayPageURL;
        res.send({ url: GatewayPageURL });

        const finalOrder = {
          orderBody,
          transactionId,
          paidStatus: false,
        };
        const result = ordersCollection.insertOne(finalOrder);
      });

      // payment success
      app.post("/payment-success/:transId", async (req, res) => {
        const result = await ordersCollection.updateOne(
          {
            transactionId: req.params.transId,
          },
          { $set: { paidStatus: true } }
        );
        if (result.modifiedCount > 0) {
          res.redirect(
            `${process.env.CLIENT_URL}/payment/success/${req.params.transId}`
          );
        }
      });

      // payment fail
      app.post("/payment-failed/:transId", async (req, res) => {
        const query = { transactionId: req.params.transId };
        const result = await ordersCollection.deleteOne(query);
        if (result.deletedCount) {
          res.redirect(
            `${process.env.CLIENT_URL}/payment/failed/${req.params.transId}`
          );
        }
      });
    });

    // card payment request
    app.post("/create-payment-intent", async (req, res) => {
      const { totalPrice, currency } = req.body;
      if (totalPrice) {
        const amount = parseFloat(totalPrice) * 100;
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: currency,
          payment_method_types: ["card"],
        });
        res.send({ clientSecret: paymentIntent.client_secret });
      }
    });

    // store card payment data
    app.post("/save-card-payment", async (req, res) => {
      const result = await ordersCollection.insertOne(req.body);
      res.send(result);
    });

    // get payment data
    app.get("/user-orders", async (req, res) => {
      const email = req.query.email;
      if (!email) {
        return res
          .status(403)
          .json({ error: true, message: "Forbidden Access" });
      }
      const query = {
        "orderBody.consumerInfo.email": email,
      };
      const result = await ordersCollection.find(query).toArray({});
      res.send(result);
    });

    app.get("/all-orders", async (req, res) => {
      const result = await ordersCollection.find().toArray({});
      res.send(result);
    });

    /** -------- product apis --------- */
    // add-product in db
    app.post("/add-product", async (req, res) => {
      const productData = req.body;
      const result = await productsCollection.insertOne(productData);
      res.send(result);
    });

    // get product from db
    app.get("/all-product-data", async (req, res) => {
      const result = await productsCollection.find().toArray({});
      res.send(result);
    });

    // single product details
    app.get("/product-details/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productsCollection.findOne(query);
      res.send(result);
    });

    // popular products
    app.get("/popular-collection", async (req, res) => {
      const cursor = { "popularity.value": "popular" };
      const result = await productsCollection.find(cursor).toArray();
      res.send(result);
    });

    // trending products
    app.get("/trending-collection", async (req, res) => {
      const cursor = { "popularity.value": "trending" };
      const result = await productsCollection.find(cursor).toArray();
      res.send(result);
    });

    // hot deals products
    app.get("/hot-deals-collection", async (req, res) => {
      const cursor = { "popularity.value": "hotDeals" };
      const result = await productsCollection.find(cursor).toArray();
      res.send(result);
    });

    // best seller products
    app.get("/best-seller-collection", async (req, res) => {
      const cursor = { "popularity.value": "bestSeller" };
      const result = await productsCollection.find(cursor).toArray();
      res.send(result);
    });

    // get products by category
    app.get("/category-products/:path", async (req, res) => {
      const allProducts = await productsCollection.find().toArray({});
      const path = req.params.path;
      if (path === 0) {
        res.send(allProducts);
      }
      const categoryProducts = allProducts.filter(
        (cate) => cate?.category?.value === path
      );
      res.send(categoryProducts);
    });

    // get categories
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
  res.send(`<h1>WELCOME TO ECKART-BD SERVER</h1>`);
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
