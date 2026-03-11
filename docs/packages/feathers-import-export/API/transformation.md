# Transformation

`feathers-import-export` allows you to apply a **transformation** before importing or exporting the data.

The transformation can be carried out via a **transform** object or via a function.

## Transform object

The **transform** object can be declared with the following specifications:

* `toArray`: boolean indicating if the JSON object will be transformed into an array using [Lodash](https://lodash.com/docs#toArray), defaults to false
* `toObjects`: if your input JSON objects are flat arrays it will be transformed into objects according to the given indexed list of property names to be used as keys, not defined by default
* `filter`: a filter to be applied on the JSON object using any option supported by [sift](https://github.com/crcn/sift.js)
* `mapping`: a map between input key path and output key path supporting dot notation, the values of the map can also be a structure like this:
  * `path`: output key path
  * `value`: a map between input values and output values
  * `delete`: boolean indicating if the input key path should be deleted or not after mapping
* `unitMapping`: a map between input key path supporting dot notation and from/to units to convert using [math.js](http://mathjs.org/docs/datatypes/units.html) for numbers or [moment.js](https://momentjs.com/) for dates, a value of the map is a structure like this:
  * `from`: the unit or date format to convert from, e.g. feet or YYYY-MM-DD HH:mm:ss.SSS
  * `to`: the unit or date format to convert to, e.g. m or MM-DD-YYYY HH:mm:ss.SSS, if given for a date the date object will be converted back to string
  * `asDate`: mandatory to indicate if the value is a date, could be utc or local to interpret it as UTC or Local Time
asString: mandatory to convert numbers to strings, indicates the [radix](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/toString#Syntax) to be used if any
  * `asNumber`: mandatory to convert strings to numbers
  * `asCase`: target case to be used as the name of a [Lodash](https://lodash.com/docs/4.17.15#lowerCase) (e.g. `lowerCase`) or [JS string](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/String) (e.g. toUpperCase) case conversion function (e.g. lowerCase)
  * `empty`: value to be set if the input value is empty
* `pick`: an array of properties to be picked using [Lodash](https://lodash.com/docs#pick)
* `omit`: an array of properties to be omitted using [Lodash](https://lodash.com/docs#omit)
merge: an object to be merged with each JSON objects using [Lodash](https://lodash.com/docs#merge)
* `asObject`: this boolean indicates if the output should be transformed into an object if the array contains a single object, defaults to false
* `asArray`: this boolean indicates if the output should be transformed into an array containing the object, defaults to false.

```js
transform: {
  toArray: true, // The following input object { 1: { property: 'a' }, 2: { property: 'b' } } will be transformed into [{ property: 'a' }, { property: 'b' }]
  toObjects: ['1', '2'], // The following input object ['a', 'b'] will be transformed into { 1: 'a', 2: 'b' }
  mapping: {
    sourceProperty: 'targetProperty',
    sourceProperty: {
      path: 'targetProperty',
      values: {
        'a': 'c' // Will map { xxx: 'a' } to { yyy: 'c' }
      }
    },
    'source.property': 'target.property',
    sourceProperty: 'targetArrayProperty[0]'
  },
  unitMapping: {
    property: { from: 'feet', to: 'm' } // This one will be converted from feet to meters
  },
  pick: ['onlyThisPropertyWillBeKept'],
  omit: ['onlyThisPropertyWillBeRemoved'],
  merge: { newProperty: 'will be added to the final objects' }
}
```

> [!TIP]
> The transformations are applied in the order of the documentation, e.g. filtering occurs before mapping.

## Transform function

The transformation function must be [registered](#registertransform-key-transform) in the service.

The function must have the following signature: `function myTransform (chunk, options)` where
* `chunk` represents an array of JSON objects.
* `options` represents the options passed to the `import` or `export` methods. It allows you to retrieve some contextual data if needed when processing the chunk.

```js
function myTransform (chunk, options) {
  chunk.forEach(object => {
    // mutate object
  })
  return chunk
}
```

To specify the transformation function within the **import** or **export** payload, you must assign to the `transform` property the **key** used to register the function

Assuming you have registered the `myTransform` function with the `my-transform` key, then you can declare the transformation function as below:

```js
transform: 'my-transform'
```