import pb, { PB_URL } from "../src/js/pocketbase.js";

const ARTISTS_COLLECTIONS = [
  process.env.PB_ARTISTS_COLLECTION,
  process.env.PUBLIC_PB_ARTISTS_COLLECTION,
  "artistes",
  "Artistes",
  "artists",
  "artist",
  "pbc_3142635823",
].filter(Boolean);
const SCENES_COLLECTIONS = [
  process.env.PB_SCENES_COLLECTION,
  process.env.PUBLIC_PB_SCENES_COLLECTION,
  "scenes",
  "Scenes",
  "scene",
].filter(Boolean);
const CONTACT_COLLECTIONS = [
  process.env.PB_CONTACT_COLLECTION,
  process.env.PUBLIC_PB_CONTACT_COLLECTION,
  "contact",
  "Contact",
].filter(Boolean);

let didAuthAttempt = false;

async function ensureAdminAuth() {
  if (didAuthAttempt) return;
  didAuthAttempt = true;

  const email = process.env.PB_ADMIN_EMAIL;
  const password = process.env.PB_ADMIN_PASSWORD;
  if (!email || !password) return;

  try {
    await pb.collection("_superusers").authWithPassword(email, password);
  } catch {
    // Keep read-only mode when admin credentials are absent.
  }
}

function getValue(record, keys, fallback = "") {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && `${value}`.trim() !== "") return value;
  }
  return fallback;
}

function pickArray(record, keys) {
  for (const key of keys) {
    const value = record?.[key];
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === "string" && value.trim()) {
      if (value.trim().startsWith("[")) {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) return parsed.filter(Boolean);
        } catch {
          return value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
        }
      }
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function slugify(value, fallback = "item") {
  if (!value) return fallback;
  return `${value}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function buildFileUrl(record, keys, fallback) {
  for (const key of keys) {
    const value = record?.[key];
    if (!value) continue;
    if (typeof value === "string" && (value.startsWith("http") || value.startsWith("/"))) return value;
    try {
      const collectionRef = record?.collectionId || record?.collectionName;
      if (collectionRef) return `${PB_URL}/api/files/${collectionRef}/${record.id}/${value}`;
      return pb.files.getURL(record, value);
    } catch {
      continue;
    }
  }
  return fallback;
}

function buildFileUrls(record, keys) {
  const values = pickArray(record, keys);

  return values
    .map((value) => {
      if (!value) return "";
      if (typeof value === "string" && (value.startsWith("http") || value.startsWith("/"))) return value;

      try {
        const collectionRef = record?.collectionId || record?.collectionName;
        if (collectionRef) return `${PB_URL}/api/files/${collectionRef}/${record.id}/${value}`;
        return pb.files.getURL(record, value);
      } catch {
        return "";
      }
    })
    .filter(Boolean);
}

function toReadableCollectionError(candidates, error) {
  const label = candidates[0] || "collection";
  const status = error?.status || error?.response?.status;
  const message = error?.response?.message || error?.message || "";

  if (status === 403) {
    return `La collection ${label} existe mais elle est privee (403). Configure PB_ADMIN_EMAIL et PB_ADMIN_PASSWORD sur le serveur Astro.`;
  }

  if (status === 404 || /Missing collection context/i.test(message)) {
    return `La collection ${label} n'existe pas sous ce nom sur PocketBase.`;
  }

  return `Impossible de charger la collection ${label}.`;
}

const DEFAULT_ARTIST_IMAGE = "/assets/img/img-art.webp";
const DEFAULT_SCENE_IMAGE = "/assets/img/img-scene (1).webp";

async function withCollection(candidates, action) {
  await ensureAdminAuth();
  let lastError = null;

  for (const collection of [...new Set(candidates)]) {
    try {
      return await action(collection);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Collection introuvable");
}

async function withCollectionClient(client, candidates, action) {
  let lastError = null;

  for (const collection of [...new Set(candidates)]) {
    try {
      return await action(client, collection);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Collection introuvable");
}

async function getFullListWithFallback(candidates, sorts = [], extraOptions = {}) {
  await ensureAdminAuth();
  let lastError = null;

  for (const collection of [...new Set(candidates)]) {
    const attempts = [...new Set(sorts.filter(Boolean))].map((sort) => ({
      ...extraOptions,
      sort,
    }));
    attempts.push({ ...extraOptions });

    for (const options of attempts) {
      try {
        return await pb.collection(collection).getFullList(options);
      } catch (error) {
        lastError = error;
        const status = error?.status || error?.response?.status;
        const message = error?.response?.message || error?.message || "";
        const isCollectionError = status === 403 || status === 404 || /Missing collection context/i.test(message);

        if (isCollectionError) break;
      }
    }
  }

  throw lastError || new Error("Collection introuvable");
}

async function getArtistsExpanded() {
  return getFullListWithFallback(ARTISTS_COLLECTIONS, ["Date,Nom", "date,name"]);
}

async function getCollectionRecords(candidates, options = {}) {
  try {
    const records = await getFullListWithFallback(candidates, [options.sort], options);
    return { records, error: null };
  } catch (error) {
    const collectionLabel = candidates[0] || "collection";
    console.error(`[PocketBase] Echec lecture ${collectionLabel}:`, error?.message || error);
    return { records: null, error };
  }
}

async function getRecordById(candidates, id, options = {}) {
  return withCollection(candidates, (collection) =>
    pb.collection(collection).getOne(id, options),
  );
}

function normalizeScene(record) {
  const name = getValue(record, ["name", "Name", "title", "Title", "nom", "Nom"], "Scene");
  const slug = getValue(record, ["slug", "Slug"], slugify(name, record.id));
  const gallery = buildFileUrls(record, ["gallery", "Gallery", "galerie", "Galerie", "images", "Images", "photos", "Photos"]);
  const image = buildFileUrl(
    record,
    ["image", "Image", "photo", "Photo", "cover", "Cover", "thumbnail", "Thumbnail", "picture", "Picture"],
    gallery[0] || DEFAULT_SCENE_IMAGE,
  );

  return {
    id: record.id,
    slug,
    name,
    description: getValue(record, ["description", "Description", "desc", "Desc", "bio", "Bio"], ""),
    location: getValue(record, ["location", "Location", "place", "Place", "lieu", "Lieu", "Localisation"], ""),
    capacity: getValue(record, ["capacity", "Capacity", "capacite", "Capacite"], ""),
    image,
    gallery: gallery.length ? gallery : [image],
    raw: record,
  };
}

function normalizeArtist(record, scenes = []) {
  const name = getValue(record, ["name", "Name", "title", "Title", "nom", "Nom"], "Artiste");
  const sceneId = getValue(record, ["scene", "Scene", "sceneId", "SceneId", "stage", "Stage"], "");
  const sceneFromList = scenes.find((scene) => scene.id === sceneId);
  const rawGenre = getValue(record, ["genre", "Genre", "style", "Style", "category", "Category"], "");
  const genres = Array.isArray(rawGenre)
    ? rawGenre.filter(Boolean)
    : `${rawGenre}`
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
  const genre = genres.join(", ");
  const gallery = buildFileUrls(record, [
    "gallery",
    "Gallery",
    "galerie",
    "Galerie",
    "images",
    "Images",
    "photos",
    "Photos",
    "image",
    "Image",
    "photo",
    "Photo",
    "avatar",
    "Avatar",
    "cover",
    "Cover",
    "thumbnail",
    "Thumbnail",
  ]);
  const sceneName =
    sceneFromList?.name ||
    getValue(record, ["sceneName", "SceneName", "scene_name", "Scene_name"], "");
  const image = buildFileUrl(
    record,
    ["image", "Image", "photo", "Photo", "avatar", "Avatar", "cover", "Cover", "thumbnail", "Thumbnail"],
    gallery[0] || DEFAULT_ARTIST_IMAGE,
  );

  return {
    id: record.id,
    slug: getValue(record, ["slug", "Slug"], slugify(name, record.id)),
    name,
    bio: getValue(record, ["bio", "Bio", "description", "Description", "desc", "Desc"], ""),
    specialty: getValue(record, ["specialty", "Specialty", "specialite", "Specialite", "role", "Role"], ""),
    genre,
    genres,
    country: getValue(record, ["country", "Country", "nationality", "Nationality", "origine", "Origine"], ""),
    date: getValue(record, ["date", "Date", "performanceDate", "PerformanceDate", "showDate", "ShowDate"], ""),
    sceneId,
    sceneName,
    tags: pickArray(record, ["tags", "Tags", "keywords", "Keywords"]),
    image,
    gallery: gallery.length ? [...new Set(gallery)] : [image],
    raw: record,
  };
}

export async function getArtistsByDate() {
  return getFullListWithFallback(ARTISTS_COLLECTIONS, ["Date,Nom", "date,name"]);
}

export async function getScenesByName() {
  return getFullListWithFallback(SCENES_COLLECTIONS, ["Nom", "name"]);
}

export async function getArtistsAlphabetical() {
  return getFullListWithFallback(ARTISTS_COLLECTIONS, ["Nom", "name"]);
}

export async function getArtistById(id) {
  return getRecordById(ARTISTS_COLLECTIONS, id);
}

export async function getSceneById(id) {
  return getRecordById(SCENES_COLLECTIONS, id);
}

export async function getArtistsBySceneId(sceneId) {
  const artists = await getArtistsExpanded();
  return artists.filter((artist) => {
    const relationId = getValue(artist, ["scene", "sceneId", "stage"], "");
    return relationId === sceneId;
  });
}

export async function getArtistsBySceneName(sceneName) {
  const artists = await getArtistsExpanded();
  const scenesResult = await getScenes();
  const needle = `${sceneName}`.toLowerCase();

  return artists.filter((artist) => {
    const relationId = getValue(artist, ["scene", "sceneId", "stage"], "");
    const sceneFromList = scenesResult.items.find((scene) => scene.id === relationId);
    const label =
      sceneFromList?.name ||
      getValue(artist, ["sceneName", "scene_name", "scene"], "");

    return `${label}`.toLowerCase() === needle;
  });
}

export async function saveArtist(data, client = null) {
  const payload = { ...data };
  const id = payload.id;
  delete payload.id;

  if (client) {
    return withCollectionClient(client, ARTISTS_COLLECTIONS, (activeClient, collection) =>
      id ? activeClient.collection(collection).update(id, payload) : activeClient.collection(collection).create(payload),
    );
  }

  await ensureAdminAuth();
  return withCollection(ARTISTS_COLLECTIONS, (collection) =>
    id ? pb.collection(collection).update(id, payload) : pb.collection(collection).create(payload),
  );
}

export async function saveScene(data, client = null) {
  const payload = { ...data };
  const id = payload.id;
  delete payload.id;

  if (client) {
    return withCollectionClient(client, SCENES_COLLECTIONS, (activeClient, collection) =>
      id ? activeClient.collection(collection).update(id, payload) : activeClient.collection(collection).create(payload),
    );
  }

  await ensureAdminAuth();
  return withCollection(SCENES_COLLECTIONS, (collection) =>
    id ? pb.collection(collection).update(id, payload) : pb.collection(collection).create(payload),
  );
}

export async function saveContact(data, client = null) {
  const payload = { ...data };
  const id = payload.id;
  delete payload.id;

  if (client) {
    return withCollectionClient(client, CONTACT_COLLECTIONS, (activeClient, collection) =>
      id ? activeClient.collection(collection).update(id, payload) : activeClient.collection(collection).create(payload),
    );
  }

  await ensureAdminAuth();
  return withCollection(CONTACT_COLLECTIONS, (collection) =>
    id ? pb.collection(collection).update(id, payload) : pb.collection(collection).create(payload),
  );
}

export async function getScenes() {
  const { records, error } = await getCollectionRecords(SCENES_COLLECTIONS, {
    sort: "Nom",
  });

  return {
    collection: SCENES_COLLECTIONS[0] || "scenes",
    items: Array.isArray(records) ? records.map((record) => normalizeScene(record)) : [],
    error: Array.isArray(records) ? null : toReadableCollectionError(SCENES_COLLECTIONS, error),
    rawError: error || null,
  };
}

export async function getArtists() {
  const scenesResult = await getScenes();
  const { records, error } = await getCollectionRecords(ARTISTS_COLLECTIONS, {
    sort: "Date,Nom",
  });

  return {
    collection: ARTISTS_COLLECTIONS[0] || "artists",
    items: Array.isArray(records)
      ? records.map((record) => normalizeArtist(record, scenesResult.items))
      : [],
    error: Array.isArray(records) ? null : toReadableCollectionError(ARTISTS_COLLECTIONS, error),
    rawError: error || null,
  };
}

export async function getArtistByIdOrSlug(identifier) {
  const { items } = await getArtists();
  return items.find((artist) => artist.id === identifier || artist.slug === identifier);
}

export async function getSceneByIdOrSlug(identifier) {
  const { items } = await getScenes();
  return items.find((scene) => scene.id === identifier || scene.slug === identifier);
}

export async function getArtistsByScene(identifier) {
  const { items } = await getArtists();
  const normalizedIdentifier = slugify(identifier);
  return items.filter((artist) => {
    const byId = artist.sceneId === identifier;
    const byName = slugify(artist.sceneName) === normalizedIdentifier;
    return byId || byName;
  });
}

export function filterArtists(artists, { genre = "", scene = "", date = "" }) {
  return artists.filter((artist) => {
    const genreValues = Array.isArray(artist.genres)
      ? artist.genres
      : `${artist.genre || ""}`
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
    const matchesGenre = genre ? genreValues.includes(genre) : true;
    const matchesScene = scene
      ? artist.sceneId === scene || artist.sceneName === scene
      : true;
    const matchesDate = date ? artist.date === date : true;

    return matchesGenre && matchesScene && matchesDate;
  });
}

export function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(date);
}

export { pb, ARTISTS_COLLECTIONS, SCENES_COLLECTIONS, CONTACT_COLLECTIONS };
