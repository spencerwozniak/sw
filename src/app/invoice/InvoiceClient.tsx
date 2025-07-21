'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';

import { MdOutlineFileDownload, MdOutlineAttachMoney } from 'react-icons/md'

export default function InvoiceClient() {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const params = useSearchParams();

  const formatCents = (amount: number, currency = 'usd') =>
  (amount / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  });

    const formatDate = (unix: number) =>
    unix ? new Date(unix * 1000).toLocaleDateString() : '-';


  useEffect(() => {
    const id = params.get('id');
    if (!id) return;
    fetch(`/api/invoice/${id}`)
      .then(res => res.json())
      .then(data => setInvoice(data))
      .finally(() => setLoading(false));
  }, [params]);

  if (loading) return <div className="flex flex-col justify-center items-center text-center min-h-[90vh] py-10 px-4 sm:px-6 lg:px-8 mt-10">Loading...</div>;
  if (!invoice) return <div className="flex flex-col justify-center items-center text-center min-h-[90vh] py-10 px-4 sm:px-6 lg:px-8 mt-10">Invoice not found.</div>;
  return (
  <div className="w-full px-4 sm:px-6 lg:px-8 mx-auto my-4 sm:my-10">
      <div className="sm:w-11/12 lg:w-3/4 mx-auto">
        <div className="flex flex-col p-4 sm:p-10 bg-black shadow-md rounded-xl">
          {/* Header */}
          <div className="flex justify-between">
            <div>
              {/* SVG or Logo */}
              <Image
                src="/sw-full-signature-white.png"
                alt="Spencer Wozniak Signature"
                width={120}
                height={50}
                className=''
                priority
                />
            </div>
            <div className="text-end">
              <h2 className="text-2xl md:text-3xl font-semibold text-white">
                Invoice #
              </h2>
              <span className="mt-1 block text-neutral-300">{invoice.number}</span>
              <address className="mt-4 not-italic text-neutral-100">
                {invoice.customer_address?.line1}
                {invoice.customer_address?.line2 ? `, ${invoice.customer_address?.line2}` : ""}
                <br />
                {invoice.customer_address?.city}, {invoice.customer_address?.state} {invoice.customer_address?.postal_code}
                <br />
                {invoice.customer_address?.country}
              </address>
            </div>
          </div>
          {/* Info */}
          <div className="mt-8 grid sm:grid-cols-2 gap-3">
            <div>
              <h3 className="text-lg font-semibold text-neutral-100">Bill to:</h3>
              <h3 className="text-lg font-semibold text-neutral-100">{invoice.customer_name}</h3>
              <address className="mt-2 not-italic text-neutral-300">
                {invoice.customer_address?.line1}
                {invoice.customer_address?.line2 ? `, ${invoice.customer_address?.line2}` : ""}
                <br />
                {invoice.customer_address?.city}, {invoice.customer_address?.state} {invoice.customer_address?.postal_code}
                <br />
                {invoice.customer_address?.country}
              </address>
            </div>
            <div className="sm:text-end space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-1 gap-3 sm:gap-2">
                <dl className="grid sm:grid-cols-5 gap-x-3">
                  <dt className="col-span-3 font-semibold text-neutral-100">Invoice date:</dt>
                  <dd className="col-span-2 text-neutral-300">
                    {formatDate(invoice.created)}
                  </dd>
                </dl>
                <dl className="grid sm:grid-cols-5 gap-x-3">
                  <dt className="col-span-3 font-semibold text-neutral-100">Due date:</dt>
                  <dd className="col-span-2 text-neutral-300">
                    {formatDate(invoice.due_date)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          {/* Line Items Table */}
          <div className="mt-6">
            <div className="border border-gray-200 p-4 rounded-lg space-y-4">
              <div className="hidden sm:grid sm:grid-cols-5">
                <div className="sm:col-span-2 text-xs font-medium text-neutral-300 uppercase">Item</div>
                <div className="text-start text-xs font-medium text-neutral-300 uppercase">Qty</div>
                <div className="text-start text-xs font-medium text-neutral-300 uppercase">Rate</div>
                <div className="text-end text-xs font-medium text-neutral-300 uppercase">Amount</div>
              </div>
              <div className="hidden sm:block border-b border-gray-200"></div>
              {invoice.lines?.data?.map((item) => (
                <div key={item.id} className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  <div className="col-span-full sm:col-span-2">
                    <h5 className="sm:hidden text-xs font-medium text-neutral-300 uppercase">Item</h5>
                    <p className="font-medium text-neutral-100">{item.description}</p>
                  </div>
                  <div>
                    <h5 className="sm:hidden text-xs font-medium text-neutral-300 uppercase">Qty</h5>
                    <p className="text-neutral-100">{item.quantity}</p>
                  </div>
                  <div>
                    <h5 className="sm:hidden text-xs font-medium text-neutral-300 uppercase">Rate</h5>
                    <p className="text-neutral-100">{formatCents(parseInt(item.pricing?.price_details?.unit_amount_decimal || "0"), item.currency)}</p>
                  </div>
                  <div>
                    <h5 className="sm:hidden text-xs font-medium text-neutral-300 uppercase">Amount</h5>
                    <p className="sm:text-end text-neutral-100">{formatCents(item.amount, item.currency)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Totals */}
          <div className="mt-8 flex sm:justify-end">
            <div className="w-full max-w-2xl sm:text-end space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-1 gap-3 sm:gap-2">
                <dl className="grid sm:grid-cols-5 gap-x-3">
                  <dt className="col-span-3 font-semibold text-neutral-100">Subtotal:</dt>
                  <dd className="col-span-2 text-neutral-300">{formatCents(invoice.subtotal, invoice.currency)}</dd>
                </dl>
                <dl className="grid sm:grid-cols-5 gap-x-3">
                  <dt className="col-span-3 font-semibold text-neutral-100">Total:</dt>
                  <dd className="col-span-2 text-neutral-300">{formatCents(invoice.total, invoice.currency)}</dd>
                </dl>
                <dl className="grid sm:grid-cols-5 gap-x-3">
                  <dt className="col-span-3 font-semibold text-neutral-100">Tax:</dt>
                  <dd className="col-span-2 text-neutral-300">{invoice.total_taxes?.[0]?.amount ? formatCents(invoice.total_taxes[0].amount, invoice.currency) : "$0.00"}</dd>
                </dl>
                <dl className="grid sm:grid-cols-5 gap-x-3">
                  <dt className="col-span-3 font-semibold text-neutral-100">Amount paid:</dt>
                  <dd className="col-span-2 text-neutral-300">{formatCents(invoice.amount_paid, invoice.currency)}</dd>
                </dl>
                <dl className="grid sm:grid-cols-5 gap-x-3">
                  <dt className="col-span-3 font-semibold text-neutral-100">Due balance:</dt>
                  <dd className="col-span-2 text-neutral-300">
                    <b>{formatCents(Math.max(0, invoice.amount_due - invoice.amount_paid), invoice.currency)}</b>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          {/* Footer */}
          <div className="mt-8 sm:mt-12">
            <h4 className="text-lg font-semibold text-neutral-100">Thank you!</h4>
            <p className="text-neutral-300">{invoice.description || "If you have any questions concerning this invoice, use the following contact information:"}</p>
            <div className="mt-2">
              <a href='mailto:hey@spencerwozniak.com' className="block text-sm font-medium text-neutral-100">hey@spencerwozniak.com</a>
            </div>
          </div>
          <p className="mt-5 text-sm text-neutral-300">© {new Date().getFullYear()} {invoice.account_name || "Your Company"}.</p>
        </div>
        {/* Buttons */}
        <div className="mt-6 flex justify-end gap-x-3">
        <a
            className="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white !text-[#b28e6d] shadow-2xs hover:bg-gray-50"
            href={invoice.invoice_pdf}
        >
            <MdOutlineFileDownload />
            Invoice PDF
        </a>
        {invoice.hosted_invoice_url && (
            <a
            className="cursor-pointer py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-transparent bg-[#a6865f] !text-white hover:bg-[#bfaa8d]"
            href={invoice.hosted_invoice_url}
            target="_blank"
            rel="noopener noreferrer"
            >
            <MdOutlineAttachMoney />
            Pay Now
            </a>
        )}
        </div>

      </div>
    </div>
  );
}
