/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1942802699")

  // update collection data
  unmarshal({
    "name": "Scene"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1942802699")

  // update collection data
  unmarshal({
    "name": "SCene"
  }, collection)

  return app.save(collection)
})
