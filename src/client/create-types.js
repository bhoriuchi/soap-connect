import _ from 'lodash'

function bestTypeMatch (wsdl, type, data) {

}

export default function createTypes (wsdl) {
  let [ nsCount, types ] = [ 1, {} ]

  // add extendedBy to keep track of inheritance
  _.forEach(wsdl.metadata.types, (namespace, nsIdx) => {
    _.forEach(namespace, (type, typeIdx) => {
      if (type.base) {
        let t = wsdl.getType(type.base)
        t.extendedBy = t.extendedBy || []
        t.extendedBy.push([nsIdx, typeIdx])
      }
    })
  })

  _.forEach(wsdl.metadata.namespaces, (namespace, nsIdx) => {
    let prefix = `ns${nsCount}`
    if (namespace.prefix) prefix = namespace.prefix
    else nsCount++
    _.forEach(namespace.types, (type, typeIdx) => {
      _.set(types, `["${prefix}"]["${type}"]`, (data) => {
        let type = wsdl.getType([nsIdx, typeIdx])
        let els = type.elements || []
        let attrs = type.attributes || []
        let base = type.base
        let properties = {}



        console.log(base)
        _.forEach(_.union(els, attrs), (el) => {
          if (el.name) {
            console.log(el.name)
          }
        })

        // let [ nidx, tidx ] = t.base
        // console.log(JSON.stringify(t))
        // console.log('extends', wsdl.metadata.namespaces[nidx].types[tidx])
        // console.log(metadata.namespaces[t.base[0]][t.base[1]])
        // console.log(nsIdx, typeIdx)
        // console.log(metadata.types[nsIdx][typeIdx])
      })
    })
  })
  return types
}