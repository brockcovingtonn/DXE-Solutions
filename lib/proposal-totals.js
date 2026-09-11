// Recomputes each line item's amount and the proposal's subtotal/total
// server-side — never trust client-submitted totals.
export function computeTotals(lineItems, adjustment) {
  const items = (lineItems || []).map((li) => {
    const quantity = Number(li.quantity) || 0;
    const unitPrice = Number(li.unit_price) || 0;
    return { ...li, quantity, unit_price: unitPrice, amount: Math.round(quantity * unitPrice * 100) / 100 };
  });
  const subtotal = Math.round(items.reduce((sum, li) => sum + li.amount, 0) * 100) / 100;
  const total = Math.round((subtotal + (Number(adjustment) || 0)) * 100) / 100;
  return { items, subtotal, total };
}
