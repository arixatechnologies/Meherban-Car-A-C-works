import Image from "next/image";
import styles from "./loading-ui.module.css";

type LoadingUiProps = {
  variant?: "page" | "panel";
  title?: string;
  subtitle?: string;
};

export function LoadingUi({
  variant = "panel",
  title = "Loading Workspace",
  subtitle = "Preparing your Meharban Car A/C Works dashboard",
}: LoadingUiProps) {
  return (
    <section
      className={`${styles.screen} ${variant === "page" ? styles.page : styles.panel}`}
      role="status"
      aria-live="polite"
    >
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
          priority
        />
      </div>
      <span className={styles.srOnly}>
        {title}. {subtitle}
      </span>
    </section>
  );
}
