import { VinylRecordIcon } from "@phosphor-icons/react/ssr";
import styles from "./shuffle-deck.module.css";
export function ShuffleDeck({
  size = "default",
}: {
  size?: "default" | "artwork";
}) {
  return (
    <div
      className={styles.deck}
      data-size={size}
      aria-hidden="true"
      data-testid="shuffle-deck"
    >
      {[0, 1, 2].map((record) => (
        <div key={record}>
          <VinylRecordIcon size={72} weight="duotone" />
        </div>
      ))}
    </div>
  );
}
