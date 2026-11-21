import { VinylRecordIcon, SparkleIcon } from "@phosphor-icons/react/ssr";
import styles from "./shuffle-deck.module.css";
export function ShuffleDeck() {
  return (
    <div className={styles.deck} aria-hidden="true" data-testid="shuffle-deck">
      <div />
      <div />
      <div>
        <VinylRecordIcon size={72} weight="duotone" />
      </div>
      <SparkleIcon className={styles.sparkle} size={28} weight="fill" />
    </div>
  );
}
