"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import styles from "./loading-ui.module.css";

type SpanLoaderSize = "page" | "button" | "inline";

export function SpanLoader({
  size = "inline",
  className,
}: {
  size?: SpanLoaderSize;
  className?: string;
}) {
  const variantClass = size === "page" ? styles.page : size === "button" ? styles.button : styles.inline;

  return (
    <section className={cn(styles.screen, variantClass, className)} role="status" aria-live="polite">
      <div className={styles.logoOrbitLoader} aria-hidden="true">
        <div className={styles.ringTrack} />
        <div className={styles.ringArc} />
        <div className={styles.innerGlow} />
        <Image
          className={styles.loaderLogo}
          src="/logo-removebg.png"
          alt=""
          width={76}
          height={76}
          priority={size === "page"}
        />
      </div>
      <span className={styles.srOnly}>Loading</span>
    </section>
  );
}

export function FullPageSpanLoader() {
  return <SpanLoader size="page" />;
}
