'use client';

import React, {useEffect, useRef, useState} from 'react';
import {useTranslations} from 'next-intl';
import {Phone, ShieldCheck, Waves} from 'lucide-react';
import {AudioWave} from '../components/AudioWave';
import styles from './HeroVisual.module.css';
import {VscRepoForked} from "react-icons/vsc";

type Repo = {
    id: number;
    name: string;
    html_url: string;
    // description: string;
    stargazers_count: number;
    forks_count: number;
};

/**
 * Мокап входящего Realtime-звонка.
 *
 * Рисуется разметкой и CSS, а не картинкой: адаптивно, ретина-независимо,
 * автоматически перекрашивается под обе темы и локализуется.
 * Анимация волны останавливается, когда блок вне вьюпорта.
 */
export function HeroGitStat() {
    const t = useTranslations('hero');
    const ref = useRef<HTMLDivElement>(null);
    const [repos, setRepos] = useState<Repo[]>([]);
    const includeRepos = [
        "air_tguserbot",
        "air_whatsbot",
        "marusia_crm",
        "air_payment",
        "air_widget",
        "air_avito",
        "air_operator",
        "air_orchestrator",
        "air_tgbot",
        "air-logger",
        "air-common",
    ];


    useEffect(() => {
        fetch("https://api.github.com/users/ikermy/repos?per_page=100&sort=stars")
            .then((res) => res.json())
            .then((data) => {

                const filtered = data.filter(
                    (repo: Repo) =>
                        repo.stargazers_count > 0 && includeRepos.includes(repo.name)
                );
                setRepos(filtered);
            });
    }, []);

    return (
        <div>
            <h2>{t('githubStats')}</h2>
            <ul>
                {repos.map((repo) => (
                    <li key={repo.id}>
                        <a href={repo.html_url} target="_blank" rel="noreferrer">
                            {repo.name}
                        </a>{" "}
                        — {repo.stargazers_count} ⭐
                        {repo.forks_count > 0 && (
                            <> | {repo.forks_count} <VscRepoForked style={{ display: "inline", fontSize: "12px" }} /></>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
