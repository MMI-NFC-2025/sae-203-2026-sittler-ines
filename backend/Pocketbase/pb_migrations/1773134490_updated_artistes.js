/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3183463462")

  // remove field
  collection.fields.removeById("text1116806396")

  // add field
  collection.fields.addAt(7, new Field({
    "hidden": false,
    "id": "select1116806396",
    "maxSelect": 3,
    "name": "Genre",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "Tap dance",
      "Electro",
      "Experimental tap"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3183463462")

  // add field
  collection.fields.addAt(2, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1116806396",
    "max": 0,
    "min": 0,
    "name": "Genre",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // remove field
  collection.fields.removeById("select1116806396")

  return app.save(collection)
})
