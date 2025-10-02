// netlify/functions/create-checkout-session.js
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async function(event, context) {
  const headers = {
    "Access-Control-Allow-Origin": "*", // Or restrict to your Squarespace domain
    "Access-Control-Allow-Headers": "Content-Type"
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: "Method Not Allowed" };
  }

  let body = {};
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const serviceFees = parseFloat(body.serviceFees) || 0;
  const donation = parseFloat(body.donation) || 0;
  const convenienceFee = serviceFees * 0.025;
  const totalAmount = serviceFees + convenienceFee + donation;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: { name: "Donation + Service Fees" },
          unit_amount: Math.round(totalAmount * 100), // in cents
        },
        quantity: 1
      }],
      mode: "payment",
      success_url: `${process.env.URL}/success.html`,
      cancel_url: `${process.env.URL}/cancel.html`,
    });

    return { statusCode: 200, headers, body: JSON.stringify({ url: session.url }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
