const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async function(event, context) {
  try {
    const { serviceFees, donation } = JSON.parse(event.body);

    const fees = parseFloat(serviceFees) || 0;
    const gift = parseFloat(donation) || 0;

    const convenienceFee = fees * 0.025;
    const totalAmount = fees + convenienceFee + gift;
    const totalInCents = Math.round(totalAmount * 100);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'Custom Payment + Donation' },
            unit_amount: totalInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: 'https://your-site.netlify.app/success',
      cancel_url: 'https://your-site.netlify.app/cancel',
    });

    return { statusCode: 200, body: JSON.stringify({ id: session.id }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
