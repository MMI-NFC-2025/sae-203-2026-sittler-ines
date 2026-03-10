import PocketBase from "pocketbase";

export const PB_URL =
  import.meta.env?.PUBLIC_POCKETBASE_URL ||
  process.env.POCKETBASE_URL ||
  process.env.PUBLIC_POCKETBASE_URL ||
  "https://sae203.ines-sittler.fr";

const pb = new PocketBase(PB_URL);
pb.autoCancellation(false);

export default pb;
