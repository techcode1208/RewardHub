require("dotenv").config();

const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");

const app = express();
const PORT = process.env.PORT || 5000;

const stripe = process.env.STRIPE_SECRET_KEY
  ? Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "RewardHub backend is running 🚀",
  });
});

// Payment configuration check
app.get("/api/payment/status", (req, res) => {
  res.json({
    stripe: !!process.env.STRIPE_SECRET_KEY,
    paypal: !!(
      process.env.PAYPAL_CLIENT_ID &&
      process.env.PAYPAL_CLIENT_SECRET
    ),
    paypalMode: process.env.PAYPAL_MODE || "sandbox",
  });
});

// Stripe test payment intent
app.post("/api/payment/create-intent", async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({
        success: false,
        message: "Stripe secret key is missing.",
      });
    }

    const { amount, currency = "usd" } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid amount is required.",
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error("Stripe error:", error.message);

    res.status(500).json({
      success: false,
      message: "Payment creation failed.",
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 RewardHub backend running on port ${PORT}`);
});