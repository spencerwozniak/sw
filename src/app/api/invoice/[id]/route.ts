// src/app/api/invoice/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export const runtime = 'nodejs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil', // or remove this line if it causes version errors
});

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    if (!id) {
      return NextResponse.json({ error: 'Missing invoice ID' }, { status: 400 });
    }

    const invoice = await stripe.invoices.retrieve(id);

    // Auto-paginate by iterating the list call directly
    const lines: Stripe.InvoiceLineItem[] = [];
    for await (const li of stripe.invoices.listLineItems(id, { limit: 100 })) {
      lines.push(li);
    }

    lines.reverse();

    const fullInvoice = { ...invoice, lines: { ...invoice.lines, data: lines } };

    return new Response(JSON.stringify(fullInvoice), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('Invoice API error:', err);
    return NextResponse.json({ error: err?.message ?? 'Invoice fetch failed' }, { status: 500 });
  }
}
