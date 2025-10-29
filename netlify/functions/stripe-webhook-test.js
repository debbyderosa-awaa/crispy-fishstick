const stripe = require("stripe")(process.env.STRIPE_TEST_KEY);
const nodemailer = require("nodemailer");

// Configure SMTP transporter
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com", // Use GMAIL for Testing
  port: 587,
  secure: false,               // True for 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

exports.handler = async (event) => {
  const sig = event.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_TEST;

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, endpointSecret);
  } catch (err) {
    console.error("Webhook Verification Failed:", err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === "checkout.session.completed" || stripeEvent.type === "payment_intent.succeeded") {
    const session = stripeEvent.data.object;
    
    console.log(session);
    
    const fullName = session.customer_details?.name || "Customer";
    const phoneNumber = session.customer_details?.phone || "N/A";
    const email = session.customer_details?.email || "N/A";
    const feeBreakdown = session.metadata?.fee_breakdown ? JSON.parse(session.metadata.fee_breakdown) : {};
    // Add Address MetaData BreakDown
    
    // Add Breakdown of Payments - Fee Breakdown
    let feeDetails = "";
    for (const [name, amount] of Object.entries(feeBreakdown)) {
      feeDetails += `${name}: $${parseFloat(amount).toFixed(2)}\n`;
    }

    
    const emailText = `
      ${fullName} has Completed a Payment.
      Phone Number: ${phoneNumber}
      Email: ${email}

      Fee Breakdown:
      ${feeDetails}
      
      Amount Paid: $${(session.amount_total / 100).toFixed(2)}
    `;

    // Internal Emails to Notify - Kind Admin for Time Being
    const recipients = ["admin@kindcreates.com"];

    try {
      for (const to of recipients) {
        await transporter.sendMail({
          from: `"America World - Customer Payment Notification" <${process.env.EMAIL_USER}>`,
          to,
          subject: `${fullName} Has Made a Payment`,
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

