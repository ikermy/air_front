'use client';

import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Modal, QRCode, Row, Spin, Typography } from 'antd';
import { Bitcoin } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getDonationCurrencies, createDonation } from './donationApi';
import styles from './CryptoDonation.module.css';

type Currency = {
  currency?: string;
  symbol?: string;
  network: string;
  name?: string;
  minDeposit?: string | number;
};
type Donation = {
  currency: string;
  depositAddress: string;
  depositTag?: string;
  network: string;
  qrCodeUri?: string;
};

export function CryptoDonation({ label }: { label: string }) {
  const t = useTranslations('support.crypto');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [selected, setSelected] = useState<Currency>();
  const [donation, setDonation] = useState<Donation>();

  useEffect(() => {
    if (!open || currencies.length) return;
    setLoading(true);
    getDonationCurrencies()
      .then((items) => {
        // Для донатов пока доступны только сети USDT.
        setCurrencies(
          items.filter(
            (item) => (item.symbol || item.currency || '').toUpperCase() === 'USDT'
          )
        );
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [open, currencies.length]);

  const create = async () => {
    if (!selected) return;
    const currency = selected.symbol || selected.currency;
    if (!currency) {
      setError('Selected currency is invalid');
      return;
    }
    setLoading(true);
    setError('');
    try {
      setDonation(await createDonation({ currency, network: selected.network }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  // Backend может вернуть готовый URI для QR, но для доната без суммы
  // достаточно закодировать сам адрес депозита.
  const qrValue = donation?.qrCodeUri || donation?.depositAddress || '';
  const usdtCurrencies = currencies.filter((currency) => currency.symbol === 'USDT');

  return (
    <>
      <Button size="large" block icon={<Bitcoin size={16} />} className={styles.button} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        destroyOnHidden
        title={t('networkTitle')}
        width={800}
        centered
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
          {t('amountHint')}
        </Typography.Paragraph>
        {error ? <Alert type="error" showIcon message={error} /> : null}
        {loading && !currencies.length ? <Spin /> : null}
        {usdtCurrencies.length && !donation ? (
          <div className={styles.form}>
            <Row gutter={[8, 8]}>
              {usdtCurrencies.map((currency, index) => {
                const symbol = currency.symbol || currency.currency || '';
                const isSelected = selected === currency;
                return (
                  <Col xs={20} sm={10} md={6} key={`${symbol}-${currency.network}-${index}`}>
                    <Card
                      hoverable
                      onClick={() => setSelected(currency)}
                      className={isSelected ? styles.selected : undefined}
                      style={{ cursor: 'pointer', border: '1px solid #d9d9d9', transition: 'all 0.3s ease' }}
                      styles={{ body: { padding: '10px' } }}
                    >
                      <div style={{ textAlign: 'center' }}>
                        <Typography.Title level={4} style={{ margin: '0 0 8px 0' }}>
                          {currency.network}
                        </Typography.Title>
                        <Typography.Text type="secondary" style={{ fontSize: '13px' }}>
                          Min. deposit: {currency.minDeposit ?? '—'} USDT
                        </Typography.Text>
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>
            <Button type="primary" disabled={!selected} loading={loading} onClick={create}>Continue</Button>
          </div>
        ) : null}
        {donation && qrValue ? (
          <div className={styles.result}>
            <QRCode value={qrValue} size={180} />
            <div className={styles.details}>
              <strong>{donation.currency} · {donation.network}</strong>
              <code>{donation.depositAddress}</code>
              {donation.depositTag ? <span>Tag/Memo: {donation.depositTag}</span> : null}
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
