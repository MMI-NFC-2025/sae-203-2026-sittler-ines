import PocketBase from "pocketbase";

// URL fixe de PocketBase pour ce projet.
export const PB_URL = "https://sae203.ines-sittler.fr";

const pb = new PocketBase(PB_URL);
pb.autoCancellation(false);

export default pb;
