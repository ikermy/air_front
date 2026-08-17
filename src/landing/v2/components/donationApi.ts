export async function getDonationCurrencies() {
  const response = await fetch('/v1/pay/donation/donation-currencies');
  if (!response.ok) throw new Error('Unable to load donation currencies');
  const data = await response.json();
  return Array.isArray(data) ? data : data.currencies || data.data || [];
}

export async function createDonation(payload: {
  currency: string;
  network: string;
}) {
  const response = await fetch('/v1/pay/donation/donation-address', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Unable to create donation address');
  }
  return await response.json();
}