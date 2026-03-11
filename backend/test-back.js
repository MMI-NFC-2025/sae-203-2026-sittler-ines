import {
  createArtist,
  createScene,
  getArtistById,
  getArtistsAlphabetical,
  getArtistsByDate,
  getArtistsBySceneId,
  getArtistsBySceneName,
  getSceneById,
  getScenesByName,
  updateArtist,
  updateScene,
} from "./backend.mjs";

// Passe a true si tu veux aussi tester la creation et la modification.
const TEST_WRITE = false;

async function run() {
  console.log("=== TEST BACKEND POCKETBASE ===");

  const artistsByDate = await getArtistsByDate();
  console.log("getArtistsByDate:", artistsByDate.length);

  const artistsByName = await getArtistsAlphabetical();
  console.log("getArtistsAlphabetical:", artistsByName.length);

  const scenesByName = await getScenesByName();
  console.log("getScenesByName:", scenesByName.length);

  const firstArtist = artistsByName[0];
  if (firstArtist) {
    const artist = await getArtistById(firstArtist.id);
    console.log("getArtistById:", artist?.id, artist?.Nom);
  } else {
    console.log("getArtistById: skip (aucun artiste)");
  }

  const firstScene = scenesByName[0];
  if (firstScene) {
    const scene = await getSceneById(firstScene.id);
    console.log("getSceneById:", scene?.id, scene?.Nom);

    const artistsBySceneId = await getArtistsBySceneId(firstScene.id);
    console.log("getArtistsBySceneId:", artistsBySceneId.length);

    const artistsBySceneName = await getArtistsBySceneName(firstScene.Nom);
    console.log("getArtistsBySceneName:", artistsBySceneName.length);
  } else {
    console.log("getSceneById/getArtistsBySceneId/getArtistsBySceneName: skip (aucune scene)");
  }

  if (TEST_WRITE) {
    const createdScene = await createScene({
      Nom: `Scene test ${Date.now()}`,
      Description: "Scene creee depuis test-back.js",
      Localisation: "Test",
      Capacite: 100,
    });
    console.log("createScene:", createdScene?.id);

    const updatedScene = await updateScene(createdScene.id, {
      Description: "Scene modifiee depuis test-back.js",
    });
    console.log("updateScene:", updatedScene?.id);

    const createdArtist = await createArtist({
      Nom: `Artiste test ${Date.now()}`,
      Description: "Artiste cree depuis test-back.js",
      Date: new Date().toISOString(),
      Scene: createdScene.id,
      Genre: ["Test"],
    });
    console.log("createArtist:", createdArtist?.id);

    const updatedArtist = await updateArtist(createdArtist.id, {
      Description: "Artiste modifie depuis test-back.js",
    });
    console.log("updateArtist:", updatedArtist?.id);
  } else {
    console.log("create/update: skip (mets TEST_WRITE a true pour tester les ecritures)");
  }
}

run().catch((error) => {
  console.error("Test backend echoue:", error?.message || error);
  process.exit(1);
});
