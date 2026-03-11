# Hooks

As mentioned before `feathers-import-export` relies on [feathers-s3](https://github.com/kalisio/feathers-s3), particularly on the methods [getObjectCommand](https://github.com/kalisio/feathers-s3?tab=readme-ov-file#getobjectcommand-data-params) and [uploadFile](https://github.com/kalisio/feathers-s3?tab=readme-ov-file#uploadfile-data-params) which are used respectively by the `import` and `export` methods. Consequently, you have the flexibility to register hooks on these methods to incorporate additional processing steps. For instance, it might be practical to include a before hook on the `uploadFile` method to execute preprocessing on the entire file before transferring it to the storage, such as converting it to another file format.

## Registering hooks

Hooks can be registered by accessing the internal **S3 service**, as demonstrated below:

```js
app.use('path-to-service', new Service(Object.assign(options, { app })))
service = app.service('path-to-service')
service.s3Service.hooks({
  before: {
    uploadFile: [myHook]
  }
})
```
## Predefined hooks

### convertGeoJson

This hook converts exported **GeoJSON** data to any format using [ogr2ogr](https://gdal.org/programs/ogr2ogr.html).

To trigger this hook,you must declare the `convertGeoJson` object in the `export` method with the following properties:
* `ogrDriver`: any [Vector driver](https://gdal.org/en/stable/drivers/vector/index.html), e.g. `KML`,
* `contentType`: file mime type; e.g. `application/vnd.google-earth.kml+xml`

For instance:

```js
convertGeoJson: {
  ogrDriver: 'ESRI Shapefile',
  contentType: 'application/zip'
}
```

> [!NOTE]
> In case of [ESRI Shapefile](https://en.wikipedia.org/wiki/Shapefile) format, you must specify a `filename` with the extension `shp.zip` to force the creation of a compressed archive containing `.shp`, `.shx`, `.dbf` and other side-car files of one or more layers.

> [!WARNING]
> This hook cannot be applied to archived data.

### reprojectGeoJson

This hook allows to reproject the exported **GeoJSON** data to any **Coordinate Reference System** using [ogr2ogr](https://gdal.org/programs/ogr2ogr.html).

To trigger this hook, you must declare the `reprojectGeoJson` object in the `export` method with the following properties:
* `srs`: any coordinate reference systems, e.g. `EPSG:3857`

For instance:
```js
reprojectGeoJson: {
  srs: `EPSG:2154`
}
```

> [!NOTE]
> The coordinate reference systems that can be passed are anything supported by the [OGRSpatialReference::SetFromUserInput()](https://gdal.org/en/stable/api/ogrspatialref.html#_CPPv4N19OGRSpatialReference16SetFromUserInputEPKc) call, which includes EPSG Projected, Geographic or Compound CRS (i.e. EPSG:4296), a well known text (WKT) CRS definition, PROJ.4 declarations, or the name of a .prj file containing a WKT CRS definition.

> [!WARNING]
> This hook cannot be applied to archived data.
