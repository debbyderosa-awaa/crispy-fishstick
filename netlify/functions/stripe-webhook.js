const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const nodemailer = require("nodemailer");

// Configure SMTP transporter
const transporter = nodemailer.createTransport({
  host: "smtp.office365.com", // Use GMAIL for Testing
  port: 587,
  secure: false,               // True for 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

exports.handler = async (event) => {
  const sig = event.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, endpointSecret);
  } catch (err) {
    console.error("Webhook Verification Failed:", err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === "checkout.session.completed" || stripeEvent.type === "payment_intent.succeeded") {
    const session = stripeEvent.data.object;
    
    const fullName = session.metadata.customer_name || "Customer";

    // Add Breakdown of Payments
    const emailText = `
      ${fullName} has Completed a Payment.
      Session ID: ${session.id}
      Amount Paid: $${(session.amount_total / 100).toFixed(2)}
    `;

    // Internal Emails to Notify - Personal Email for Testing
    const recipients = ["bsturner38@yahoo.com"];

    try {
      for (const to of recipients) {
        await transporter.sendMail({
          from: `"Payments Notification" <${process.env.EMAIL_USER}>`,
          to,
          subject: `${fullName} Has Paid`,
          text: emailText
        });
      }
      console.log("Notification Email Sent Successfully.");
    } catch (err) {
      console.error("Error Sending Emails:", err);
    }
  }

  return { statusCode: 200, body: "Received" };
};

