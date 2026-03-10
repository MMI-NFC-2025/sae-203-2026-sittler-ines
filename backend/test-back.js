import {
  getArtistById,
  getArtistsAlphabetical,
  getArtistsByDate,
  getArtistsBySceneId,
  getArtistsBySceneName,
  getSceneById,
  getScenesByName,
  saveArtist,
  saveScene,
} from "./backend.mjs";

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
    console.log("getArtistById:", artist?.id, artist?.name || artist?.title || artist?.nom);
  } else {
    console.log("getArtistById: skip (aucun artiste)");
  }

  const firstScene = scenesByName[0];
  if (firstScene) {
    const scene = await getSceneById(firstScene.id);
    console.log("getSceneById:", scene?.id, scene?.name || scene?.title || scene?.nom);

    const artistsBySceneId = await getArtistsBySceneId(firstScene.id);
    console.log("getArtistsBySceneId:", artistsBySceneId.length);

    const sceneName = firstScene.name || firstScene.title || firstScene.nom || "";
    if (sceneName) {
      const artistsBySceneName = await getArtistsBySceneName(sceneName);
      console.log("getArtistsBySceneName:", artistsBySceneName.length);
    } else {
      console.log("getArtistsBySceneName: skip (nom de scene absent)");
    }
  } else {
    console.log("getSceneById/getArtistsBySceneId/getArtistsBySceneName: skip (aucune scene)");
  }

  if (process.env.RUN_WRITE_TESTS === "1") {
    const savedArtist = await saveArtist({
      name: `Test Artist ${Date.now()}`,
      bio: "Record de test",
      genre: "Test",
    });
    console.log("saveArtist:", savedArtist?.id);

    const savedScene = await saveScene({
      name: `Test Scene ${Date.now()}`,
      description: "Record de test",
    });
    console.log("saveScene:", savedScene?.id);
  } else {
    console.log("saveArtist/saveScene: skip (set RUN_WRITE_TESTS=1 pour tester les ecritures)");
  }
}

run().catch((error) => {
  console.error("Test backend echoue:", error?.message || error);
  process.exit(1);
});
