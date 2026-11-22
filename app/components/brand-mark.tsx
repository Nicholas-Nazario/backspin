import styles from "./brand-mark.module.css";

export function BrandMark({ size }: { size: number }) {
  return (
    <img
      src="/brand/citrus-bloom.png"
      width={size}
      height={size}
      alt=""
      className={styles.mark}
    />
  );
}
