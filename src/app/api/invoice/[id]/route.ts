
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-03-31.basil' });

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'Missing invoice ID' }, { status: 400 });
  }
  try {
    const invoice = await stripe.invoices.retrieve(id);
    return NextResponse.json(invoice, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 404 });
  }
}
