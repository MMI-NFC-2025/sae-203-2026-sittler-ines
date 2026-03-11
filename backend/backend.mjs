import pb from "../src/js/pocketbase.js";

// IDs fixes des collections PocketBase du projet.
const ARTISTS_COLLECTION = "pbc_3183463462";
const SCENES_COLLECTION = "pbc_1942802699";
const CONTACT_COLLECTION = "pbc_3711015378";

const DEFAULT_ARTIST_IMAGE = "/assets/img/img-art.webp";
const DEFAULT_SCENE_IMAGE = "/assets/img/img-scene (1).webp";

function slugify(value) {
  return `${value || ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "") || "item";
}

function toArray(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (!value) {
    return [];
  }

  return `${value}`
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getFileUrl(record, fieldName, fallback = "") {
  const fileName = record?.[fieldName];

  if (!fileName) {
    return fallback;
  }

  return pb.files.getURL(record, fileName);
}

function getFileUrls(record, fieldName) {
  const files = Array.isArray(record?.[fieldName]) ? record[fieldName] : [];
  return files.filter(Boolean).map((fileName) => pb.files.getURL(record, fileName));
}

function getErrorMessage(label, error) {
  const status = error?.status || error?.response?.status;

  if (status === 404) {
    return `La collection ${label} est introuvable.`;
  }

  if (status === 403) {
    return `La collection ${label} est protegee.`;
  }

  return `Impossible de charger ${label}.`;
}

// Formate une scene pour avoir des noms simples cote front.
function formatScene(record) {
  const image = getFileUrl(record, "Photo", DEFAULT_SCENE_IMAGE);

  return {
    id: record.id,
    slug: slugify(record.Nom || record.id),
    name: record.Nom || "Scene",
    description: record.Description || "",
    location: record.Localisation || "",
    capacity: record.Capacite || "",
    image,
    gallery: [image],
    raw: record,
  };
}

// Formate un artiste pour avoir des noms simples cote front.
function formatArtist(record, scenes = []) {
  const genres = toArray(record.Genre);
  const gallery = getFileUrls(record, "Galerie");
  const image = getFileUrl(record, "Image", gallery[0] || DEFAULT_ARTIST_IMAGE);
  const scene = scenes.find((item) => item.id === record.Scene);

  return {
    id: record.id,
    slug: slugify(record.Nom || record.id),
    name: record.Nom || "Artiste",
    bio: record.Description || "",
    specialty: "",
    genre: genres.join(", "),
    genres,
    country: "",
    date: record.Date || "",
    sceneId: record.Scene || "",
    sceneName: scene?.name || "",
    tags: [],
    image,
    gallery: gallery.length ? [image, ...gallery.filter((url) => url !== image)] : [image],
    raw: record,
  };
}

// Fonctions demandees dans la consigne.
export async function getArtistsByDate() {
  return pb.collection(ARTISTS_COLLECTION).getFullList({ sort: "Date,Nom" });
}

export async function getScenesByName() {
  return pb.collection(SCENES_COLLECTION).getFullList({ sort: "Nom" });
}

export async function getArtistsAlphabetical() {
  return pb.collection(ARTISTS_COLLECTION).getFullList({ sort: "Nom" });
}

export async function getArtistById(id) {
  return pb.collection(ARTISTS_COLLECTION).getOne(id);
}

export async function getSceneById(id) {
  return pb.collection(SCENES_COLLECTION).getOne(id);
}

export async function getArtistsBySceneId(sceneId) {
  const artists = await getArtistsByDate();
  return artists.filter((artist) => artist.Scene === sceneId);
}

export async function getArtistsBySceneName(sceneName) {
  const scenes = await getScenesByName();
  const normalizedName = `${sceneName || ""}`.trim().toLowerCase();
  const scene = scenes.find((item) => `${item.Nom || ""}`.trim().toLowerCase() === normalizedName);

  if (!scene) {
    return [];
  }

  return getArtistsBySceneId(scene.id);
}

// Fonctions separees pour la creation et la modification.
export async function createArtist(data, client = null) {
  const activeClient = client || pb;
  return activeClient.collection(ARTISTS_COLLECTION).create(data);
}

export async function updateArtist(id, data, client = null) {
  const activeClient = client || pb;
  return activeClient.collection(ARTISTS_COLLECTION).update(id, data);
}

export async function createScene(data, client = null) {
  const activeClient = client || pb;
  return activeClient.collection(SCENES_COLLECTION).create(data);
}

export async function updateScene(id, data, client = null) {
  const activeClient = client || pb;
  return activeClient.collection(SCENES_COLLECTION).update(id, data);
}

export async function saveContact(data, client = null) {
  const activeClient = client || pb;
  return activeClient.collection(CONTACT_COLLECTION).create(data);
}

// Fonctions utilitaires utilisees par le site Astro.
export async function getScenes() {
  try {
    const records = await getScenesByName();

    return {
      collection: SCENES_COLLECTION,
      items: records.map(formatScene),
      error: null,
      rawError: null,
    };
  } catch (error) {
    return {
      collection: SCENES_COLLECTION,
      items: [],
      error: getErrorMessage("les scenes", error),
      rawError: error,
    };
  }
}

export async function getArtists() {
  try {
    const scenesResult = await getScenes();
    const records = await getArtistsByDate();

    return {
      collection: ARTISTS_COLLECTION,
      items: records.map((record) => formatArtist(record, scenesResult.items)),
      error: null,
      rawError: null,
    };
  } catch (error) {
    return {
      collection: ARTISTS_COLLECTION,
      items: [],
      error: getErrorMessage("les artistes", error),
      rawError: error,
    };
  }
}

export async function getArtistByIdOrSlug(identifier) {
  const artistsResult = await getArtists();

  return artistsResult.items.find((artist) => {
    return artist.id === identifier || artist.slug === identifier;
  });
}

export async function getSceneByIdOrSlug(identifier) {
  const scenesResult = await getScenes();

  return scenesResult.items.find((scene) => {
    return scene.id === identifier || scene.slug === identifier;
  });
}

export async function getArtistsByScene(identifier) {
  const artistsResult = await getArtists();
  const normalizedIdentifier = slugify(identifier);

  return artistsResult.items.filter((artist) => {
    return artist.sceneId === identifier || slugify(artist.sceneName) === normalizedIdentifier;
  });
}

export function filterArtists(artists, filters = {}) {
  const genre = filters.genre || "";
  const scene = filters.scene || "";
  const date = filters.date || "";

  return artists.filter((artist) => {
    const matchesGenre = genre ? artist.genres.includes(genre) : true;
    const matchesScene = scene ? artist.sceneId === scene || artist.sceneName === scene : true;
    const matchesDate = date ? artist.date === date : true;

    return matchesGenre && matchesScene && matchesDate;
  });
}

export function formatDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(date);
}

export { pb, ARTISTS_COLLECTION, SCENES_COLLECTION, CONTACT_COLLECTION };
