import _ from 'lodash'
import url from 'url'
import xmldom from 'xmldom'
import request from 'request'
import { XS_NS, WSDL_NS } from '../../const'

export default function loadDoc (uri, cache) {
  if (!_.has(cache, uri)) {
    cache[uri] = {}
    let baseURI = `${uri.substring(0, uri.lastIndexOf('/'))}/`
    console.log('loading', uri)
    this.emit('wsdl.load.start', uri)

    request(uri, (err, res, body) => {
      if (err || res.statusCode !== 200) return this.emit('wsdl.load.error', err || body || res)
      let doc = cache[uri] = new xmldom.DOMParser().parseFromString(body)
      let wsdlImports = doc.getElementsByTagNameNS(WSDL_NS, 'import')
      let xsImports = doc.getElementsByTagNameNS(XS_NS, 'import')
      let xsIncludes = doc.getElementsByTagNameNS(XS_NS, 'include')
      _.forEach(_.union(wsdlImports, xsImports, xsIncludes), (link) => {
        let loc = link.getAttribute('location') || link.getAttribute('schemaLocation')
        this.loadDoc(url.parse(loc).host ? loc : url.resolve(baseURI, loc), cache)
      })

      this.emit('wsdl.load.end', uri)
    })
  }
}