/** Distinguishes an old asynchronous task even after navigating A -> B -> A. */
export const createChronicleGeneration = () => {
  let generation = 0;
  return {
    invalidate: () => { generation += 1; },
    capture: () => generation,
    isCurrent: (captured: number) => captured === generation,
  };
};
