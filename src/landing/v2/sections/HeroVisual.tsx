'use client';

import React, {useEffect, useRef, useState} from 'react';
import {useTranslations} from 'next-intl';
import {Phone, ShieldCheck, Waves} from 'lucide-react';
import {AudioWave} from '../components/AudioWave';
import styles from './HeroVisual.module.css';
import {VscRepoForked} from "react-icons/vsc";

/**
 * Мокап входящего Realtime-звонка.
 *
 * Рисуется разметкой и CSS, а не картинкой: адаптивно, ретина-независимо,
 * автоматически перекрашивается под обе темы и локализуется.
 * Анимация волны останавливается, когда блок вне вьюпорта.
 */
export function HeroVisual() {
    const t = useTranslations('hero');
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const el = ref.current;
        if (!el || typeof IntersectionObserver === 'undefined') return;

        const io = new IntersectionObserver(
            ([entry]) => setVisible(entry.isIntersecting),
            {threshold: 0.05}
        );
        io.observe(el);
        return () => io.disconnect();
    }, []);

    return (
        <div className={styles.wrap} ref={ref} role="img" aria-label={t('visualAlt')}>
            <div className={styles.glow} aria-hidden/>

            <div className={styles.panel}>
                <div className={styles.chrome} aria-hidden>
                    <span className={styles.dot} data-tone="a"/>
                    <span className={styles.dot} data-tone="b"/>
                    <span className={styles.dot} data-tone="c"/>
                    <span className={styles.chromeTitle}>air_tguserbot</span>
                    <span className={styles.live}>
            <span className={styles.livePulse}/>
            LIVE
          </span>
                </div>

                <div className={styles.body}>
                    <div className={styles.callRow}>
            <span className={styles.avatar} aria-hidden>
              <Phone size={18}/>
            </span>
                        <div className={styles.callMeta}>
                            <span className={styles.callTitle}>{t('callIncoming')}</span>
                            <span className={styles.callSub}>{t('callChannel')}</span>
                        </div>
                        <span className={styles.timer}>00:07</span>
                    </div>

                    <div className={styles.waveBox}>
                        <AudioWave active={visible}/>
                        <span className={styles.waveLabel}>
              <Waves size={13} aria-hidden/>
                            {t('callAgent')}
            </span>
                    </div>

                    <div className={styles.transcript}>
                        <span className={styles.caret} aria-hidden/>
                        <span className={styles.transcriptText}>{t('callStatus')}</span>
                    </div>

                    <div className={styles.secure}>
                        <ShieldCheck size={14} aria-hidden/>
                        <span>MasterKey · AES-GCM</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
