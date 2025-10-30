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
    console.log(session.metadata);

    // Access the MetaData and Store it for Email
    const fullName = session.metadata?.customer_name || "Customer";
    const phoneNumber = session.metadata?.phone || "N/A";
    const email = session.metadata?.email || "N/A";
    const donation = session.metadata?.donation || "0";
    const convenienceFee = session.metadata?.convFee || "0";
    const feeBreakdown = session.metadata?.fee_breakdown ? JSON.parse(session.metadata.fee_breakdown) : {};
    const addressLine1 = session.metadata?.address_line1 || "N/A";
    const addressLine2 = session.metadata?.address_line2 || "N/A";
    const city = session.metadata?.city || "N/A";
    const state = session.metadata?.state || "N/A";
    const zip = session.metadata?.zip || "N/A";
    const country = session.metadata?.country || "N/A";
    
    // Add Breakdown of Payments - Fee Breakdown
    let feeDetails = "";
    for (const [name, amount] of Object.entries(feeBreakdown)) {
        feeDetails += `${name}: $${parseFloat(amount).toFixed(2)}\n\t`;
    }

    
    const emailText = `
      ${fullName} has Completed a Payment.
      Phone Number: ${phoneNumber}
      Email: ${email}
      Address: ${addressLine1}
      Convenience Fee: ${convenienceFee}
      
      Fee Breakdown:
      ${feeDetails}
      Total Amount Paid: $${(session.amount_total / 100).toFixed(2)}
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

