'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

import { MdOutlineFileDownload, MdOutlineAttachMoney } from 'react-icons/md';

import { Button, Meta, Panel, Signature, TextLink, Title } from '@/components/ui';

interface InvoiceAddress {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
}

interface InvoiceLineItem {
  id: string;
  description?: string | null;
  quantity?: number | null;
  price?: { unit_amount?: number | null } | null;
  amount: number;
  currency: string;
}

interface Invoice {
  number?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_address?: InvoiceAddress | null;
  created?: number | null;
  due_date?: number | null;
  currency?: string;
  lines?: { data?: InvoiceLineItem[] };
  subtotal?: number;
  total?: number;
  total_taxes?: Array<{ amount?: number | null }> | null;
  amount_due?: number;
  amount_paid?: number;
  description?: string | null;
  account_name?: string | null;
  invoice_pdf?: string;
  hosted_invoice_url?: string;
}

function InvoiceButtons({ invoice }: { invoice: Invoice }) {
  return (
    <div className="flex flex-wrap gap-3 print:hidden">
      <Button size="sm" href={invoice.invoice_pdf} newTab={false} icon={<MdOutlineFileDownload />}>
        Invoice PDF
      </Button>
      {invoice.hosted_invoice_url && (
        <Button variant="primary" size="sm" href={invoice.hosted_invoice_url} icon={<MdOutlineAttachMoney />}>
          Pay Now
        </Button>
      )}
    </div>
  );
}

export default function InvoiceClient() {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const params = useSearchParams();

  const formatCents = (amount: number, currency = 'usd') =>
    (amount / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    });

  const formatDate = (unix?: number | null) =>
    unix ? new Date(unix * 1000).toLocaleDateString() : '-';

  useEffect(() => {
    const id = params.get('id');
    if (!id) return;
    fetch(`/api/invoice/${id}`)
      .then((res) => res.json())
      .then((data) => setInvoice(data))
      .finally(() => setLoading(false));
  }, [params]);

  if (loading) return <p className="text-center">Loading...</p>;
  if (!invoice) return <p className="text-center">Invoice not found.</p>;

  const hasCustomerAddress =
    !!invoice.customer_address &&
    !!(
      invoice.customer_address.line1 ||
      invoice.customer_address.line2 ||
      invoice.customer_address.city ||
      invoice.customer_address.state ||
      invoice.customer_address.postal_code ||
      invoice.customer_address.country
    );

  return (
    <>
      <div className="mb-6">
        <InvoiceButtons invoice={invoice} />
      </div>

      <Panel>
        {/* Header */}
        <div className="flex flex-wrap justify-between gap-6">
          <Link href="/">
            <Signature className="h-10 w-auto" priority />
          </Link>
          <div className="ml-auto text-end">
            <Title as="h2" size="h2">
              Invoice #{invoice.number}
            </Title>
            <p className="mt-4 text-muted">{invoice.customer_name || 'Spencer Wozniak'}</p>
            <TextLink
              href={`mailto:${invoice.customer_email || 'hey@spencerwozniak.com'}`}
              className="text-muted"
            >
              {invoice.customer_email || 'hey@spencerwozniak.com'}
            </TextLink>
          </div>
        </div>

        {/* Info */}
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div>
            <Meta as="p">Bill to:</Meta>
            <p className="font-bold">{invoice.customer_name}</p>
            {hasCustomerAddress && (
              <address className="mt-2 not-italic">
                {invoice.customer_address?.line1}
                {invoice.customer_address?.line2 ? `, ${invoice.customer_address?.line2}` : ''}
                <br />
                {[
                  invoice.customer_address?.city,
                  invoice.customer_address?.state,
                  invoice.customer_address?.postal_code,
                ]
                  .filter(Boolean)
                  .join(', ')}
                <br />
                {invoice.customer_address?.country}
              </address>
            )}
          </div>
          <dl className="m-0 space-y-2 sm:text-end">
            <div>
              <Meta as="dt">Invoice date:</Meta>
              <dd className="m-0">{formatDate(invoice.created)}</dd>
            </div>
            <div>
              <Meta as="dt">Due date:</Meta>
              <dd className="m-0">{formatDate(invoice.due_date)}</dd>
            </div>
          </dl>
        </div>

        {/* Line items */}
        <Panel padding="sm" className="mt-8 space-y-4">
          <div className="hidden gap-2 sm:grid sm:grid-cols-5">
            <Meta as="div" className="sm:col-span-2">
              Item
            </Meta>
            <Meta as="div">Qty</Meta>
            <Meta as="div">Rate</Meta>
            <Meta as="div" className="text-end">
              Amount
            </Meta>
          </div>
          <hr className="hidden sm:block" />
          {invoice.lines?.data?.map((item, i, arr) => (
            <div key={item.id}>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                <div className="col-span-full sm:col-span-2">
                  <Meta as="p" className="sm:hidden">
                    Item
                  </Meta>
                  <p className="font-bold">{item.description}</p>
                </div>
                <div>
                  <Meta as="p" className="sm:hidden">
                    Qty
                  </Meta>
                  <p>{item.quantity}</p>
                </div>
                <div>
                  <Meta as="p" className="sm:hidden">
                    Rate
                  </Meta>
                  <p>
                    {formatCents(
                      item.price?.unit_amount ||
                        (item.quantity && item.quantity > 0 ? Math.round(item.amount / item.quantity) : 0),
                      item.currency
                    )}
                  </p>
                </div>
                <div>
                  <Meta as="p" className="sm:hidden">
                    Amount
                  </Meta>
                  <p className="sm:text-end">{formatCents(item.amount, item.currency)}</p>
                </div>
              </div>
              {i < arr.length - 1 && <hr className="mt-4" />}
            </div>
          ))}
        </Panel>

        {/* Totals */}
        <div className="mt-8 flex justify-end">
          <dl className="w-full max-w-xs space-y-2 text-end">
            <div className="flex items-baseline justify-between gap-3">
              <Meta as="dt">Subtotal:</Meta>
              <dd>{formatCents(invoice.subtotal ?? 0, invoice.currency)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <Meta as="dt">Total:</Meta>
              <dd>{formatCents(invoice.total ?? 0, invoice.currency)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <Meta as="dt">Tax:</Meta>
              <dd>
                {invoice.total_taxes?.[0]?.amount
                  ? formatCents(invoice.total_taxes[0].amount, invoice.currency)
                  : '$0.00'}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <Meta as="dt">Amount paid:</Meta>
              <dd>{formatCents(invoice.amount_paid ?? 0, invoice.currency)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <Meta as="dt">Due balance:</Meta>
              <dd>
                <b>{formatCents(Math.max(0, (invoice.amount_due ?? 0) - (invoice.amount_paid ?? 0)), invoice.currency)}</b>
              </dd>
            </div>
          </dl>
        </div>

        {/* Footer */}
        <div className="mt-8 sm:mt-12">
          <Title as="h4" size="h4">
            Thank you!
          </Title>
          <p className="text-muted">
            {invoice.description ||
              'If you have any questions concerning this invoice, use the following contact information:'}
          </p>
          <TextLink href="mailto:hey@spencerwozniak.com" className="mt-2 block">
            hey@spencerwozniak.com
          </TextLink>
        </div>
        <p className="mt-5 text-muted">
          © {new Date().getFullYear()} {invoice.account_name || 'Your Company'}.
        </p>
      </Panel>

      <div className="mt-6">
        <InvoiceButtons invoice={invoice} />
      </div>
    </>
  );
}
