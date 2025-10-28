// netlify/functions/create-checkout-session-new.js
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async function(event, context) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
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

 const { formData = {}, feeBreakdown = {}, donation = 0 } = body;
 const serviceFees = Object.values(feeBreakdown).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
 const convenienceFee = serviceFees * 0.025;


  try {
    // Storing Line Items in Array
    const lineItems = [];

    // Add Fee's from Fee Breakdown
    for (const [feeName, feeAmount] of Object.entries(feeBreakdown)) {
      if(feeAmount > 0) {
        lineItems.push({
          price_data: {
            currency: "usd",
            product_data: {
              name: feeName,
            },
            unit_amount: Math.round(feeAmount * 100),
          },
          quantity: 1,
        });
      }
    }

    // Add Donation
    if (donation > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: "Donation",
          },
          unit_amount: Math.round (donation * 100),
        },
        quantity: 1,
      });
    }

    // Add Convenience Fee
    if (convenienceFee > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: "Credit Card Convenience Fee (2.5%)",
          },
          unit_amount: Math.round(convenienceFee * 100),
        },
        quantity: 1,
      });
    }  


    // Add User's Name to the MetaData and Checkout Session
    const fullName = `${formData["First Name"]} ${formData["Last Name"]}`;

    // Add Fee Breakdown to the MetaData
    const feeBreakdownStr = JSON.stringify(feeBreakdown);
    console.log("Fee Breakdown : " feeBreakdownStr);

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      metadata: {
        customer_name: fullName,
        email: formData.Email || "",
      },
      mode: "payment",
      success_url: `https://www.awaa.org/success`,
      cancel_url: `https://www.awaa.org/cancel`,
    });

    return { statusCode: 200, headers, body: JSON.stringify({ url: session.url }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
