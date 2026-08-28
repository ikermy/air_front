import Head from "next/head";
import ClientApp from "../src/ClientAppOnly";

export default function DashboardRoute() {
  return (
    <>
      <Head>
        {/* Свой favicon для дашборда: отдельный набор в /favicon,
            не тот, что у лендинга (/favicon.ico в корне public). */}
        <link rel="icon" href="/favicon/favicon.ico" sizes="any" />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon/favicon-16x16.png"
        />
        <link rel="apple-touch-icon" href="/favicon/apple-touch-icon.png" />
      </Head>
      <ClientApp />
    </>
  );
}
