/**
 * SOAP Connect
 * 
 * @author Branden Horiuchi <bhoriuchi@gmail.com>
 * @license MIT
 * 
 */
module.exports = function(env) {
	
	var emitter   = new env.events.EventEmitter();
	var url       = env.url;
	var xml       = env.xml;
	var xmldom    = env.xmldom;
	var _         = env.lodash;
	var request   = env.request;
	var Promise   = env.promise;
	var fn        = {};
	
	// define standard schemas types
	var standardSchemas = {
		'http://www.w3.org/2001/XMLSchema': {
			'string': { properties: { value: 'String' } },
			'normalizedString': { properties: { value: 'String' } },
			'token': { properties: { value: 'String' } },
			'boolean': { properties: { value: 'Boolean' } },
			'byte': { properties: { value: 'Number' } },
			'decimal': { properties: { value: 'Number' } },
			'float': { properties: { value: 'Number' } },
			'double': { properties: { value: 'Number' } },
			'int': { properties: { value: 'Number' } },
			'integer': { properties: { value: 'Number' } },
			'long': { properties: { value: 'Number' } },
			'negativeInteger': { properties: { value: 'Number' } },
			'nonNegativeInteger': { properties: { value: 'Number' } },
			'nonPositiveInteger': { properties: { value: 'Number' } },
			'positiveInteger': { properties: { value: 'Number' } },
			'short': { properties: { value: 'Number' } },
			'unsignedLong': { properties: { value: 'Number' } },
			'unsignedInt': { properties: { value: 'Number' } },
			'unsignedShort': { properties: { value: 'Number' } },
			'unsignedByte': { properties: { value: 'Number' } },
			'duration': { properties: { value: 'String' } },
			'dateTime': { properties: { value: 'Date' } },
			'time': { properties: { value: 'Date' } },
			'date': { properties: { value: 'Date' } },
			'base64Binary': { properties: { value: 'String' } },
			'hexBinary': { properties: { value: 'String' } },
		}
	};
	
	
	/**
	 * utility functions
	 */
	function _equals(value1, value2, i) {
		if ((value1 === value2) || (i === true && _.toLower(value1) === _.toLower(value2))) {
			return true;
		}
		return false;
	}
	function equals(value1, value2, i) {
		if (Array.isArray(value2)) {
			for (var j = 0; j < value2.length; j++) {
				if (_equals(value1, value2[j], i)) {
					return true;
				}
			}
			return false;
		}
		else {
			return _equals(value1, value2, i);
		}
	}
	function iequals(value1, value2) {
		return equals(value1, value2, true);
	}
	function attrName(attr) {
		return attr.name || attr.nodeName || attr.localName;
	}
	function attrValue(attr) {
		return attr.value || attr.nodeValue;
	}
	function tagType(tag) {
		return tag.tagName || tag.nodeName;
	}
	function getType(type, schema) {
		var out = {};
		var t   = type.split(':');
		if (t.length > 1) {
			out.prefix = _.get(schema, '_ns.' + t[0]);
			out.type   = t[1];
			out.obj    = _.get(schema, t[1]);
		}
		else {
			out.prefix = null;
			out.type   = type;
			out.obj    = _.get(schema, type);
		}
		return out;
	}
	function nsplit(ns) {
		var a = ns.split(':');
		if (a.length > 1) {
			return { prefix: a[0], name: a[1] };
		}
		return { prefix: '', name: ns };
	}
	
	
	/**
	 * WSDL processing
	 */
	fn.getChild = function(type, tag, ns, isProp, isSeq, isType) {
		type = _.toLower(type);
		if (_.has(fn, type)) {
			return fn[type](tag, ns, isProp, isSeq, isType);
		}
		else {
			return fn.expandChildren(tag, ns, isProp, isSeq, isType);
		}
	};
	fn.expandChildren = function(tag, ns, isProp, isSeq, isType) {
		var meta = {};
		_.forEach(tag.childNodes, function(child) {
			_.merge(meta, fn.getChild(tagType(child), child, ns, isProp, isSeq, isType));
		});
		return meta;
	};
	fn.expandValue = function(tag, ns, isProp, isSeq) {
		var meta = {};
		var name = tag.getAttribute('name');
		isProp   = (isProp === true) ? true : false;

		meta[name] = meta[name] || !isProp ? { props: {} } : {};
		
		if (isSeq) {
			meta[name].sequence = true;
			isSeq = false;
		}
		
		_.forEach(tag.attributes, function(attr) {
			if (!iequals(attrName(attr), 'name')) {
				meta[name][attrName(attr)] = attrValue(attr);
			}
		});
		_.merge(meta[name].props, fn.expandChildren(tag, ns, true, isSeq));
		return meta;
	};
	
	//fn.sequence = function(tag, ns, isProp, isSeq) {
	//	return fn.expandChildren(tag, ns, isProp, false);
	//};
	fn.types = function(tag, ns) {
		return fn.expandChildren(tag, ns, false, false, true);
	};
	
	fn.complextype = function(tag, ns, isProp, isSeq, isType) {
		var meta = {};
		var name = tag.getAttribute('name');
		if (name) {
			console.log(name);
			_.set(meta, name + '.prop', fn.expandChildren(tag, ns, true, isSeq, isType));
		}
		else {
			meta = fn.expandChildren(tag, ns, isProp, isSeq, isType);
		}
		return meta;
	};
	
	fn.simpleType  = fn.expandChildren;
	fn.element     = fn.expandValue;
	fn.attribute   = fn.expandValue;
	/*
	wsdlTypes.enumeration = function(element, childSchema, prefix) {
		var value = element.getAttribute('value');
		if (value) {
			childSchema.enumeration = true;
			childSchema.properties[value] = value;
		}
		wsdlTypes.expandChildren(element, childSchema, prefix);
	};
	wsdlTypes.extension = function(element, childSchema, prefix) {
		childSchema.inherits = element.getAttribute('base');
		wsdlTypes.expandChildren(element, childSchema, prefix);
	};
	*/
	
	/**
	 * Document load
	 */
	function getDocument(uri, options, documents) {
		documents = documents || {};
		return new Promise(function(resolve, reject) {
			if (_.has(documents, uri)) {
				return resolve({});
			}
			request(uri, function(error, response, body) {
				var lookups  = [];
				var baseURI  = uri.substring(0, uri.lastIndexOf('/')) + '/';
				if (error || response.statusCode !== 200) {
					return reject(error || body || response);
				}
				var doc = new xmldom.DOMParser().parseFromString(body);
				var de  = doc.documentElement;
				documents[uri] = doc;
				_.forEach(de._nsMap, function(ns, name) {
					_.forEach(de.getElementsByTagNameNS(ns, 'include'), function(tag) {
						_.forEach(tag.attributes, function(attr) {
							if (iequals(attrName(attr), 'location') || iequals(attrName(attr),'schemaLocation')) {
								lookups = _.union(lookups, [attrValue(attr)]);
							}
						});
					});
					_.forEach(de.getElementsByTagNameNS(ns, 'import'), function(tag) {
						_.forEach(tag.attributes, function(attr) {
							if (iequals(attrName(attr), 'location') || iequals(attrName(attr), 'schemaLocation')) {
								lookups = _.union(lookups, [attrValue(attr)]);
							}
						});
					});
				});
				Promise.each(lookups, function(lookup) {
					var parseLookup = url.parse(lookup);
					var lookupURI   = parseLookup.host ? lookup : url.resolve(baseURI, lookup);
					if (!_.has(documents, lookupURI)) {
						return getDocument(lookupURI, options, documents);
					}
				})
				.then(function() {
					resolve(documents);
				})
				.caught(function(err) {
					reject(err);
				});
			});
		});
	}
	

	
	
	/*
	 * process service
	 */
	fn.service = function(tag, ns) {
		var meta    = {};
		var name    = tag.getAttribute('name');
		var tns     = tag.getAttribute('targetNamespace');
		ns          = tns ? tns : ns;
		_.set(meta, ns + '.' + name, {});
		_.merge(meta[ns][name], fn.expandChildren(tag, ns));
		return meta;
	};

	/*
	 * process ports
	 */
	fn.port = function(tag, ns) {
		var meta    = {};
		var nsMap   = tag.ownerDocument.documentElement._nsMap;
		var binding = nsplit(tag.getAttribute('binding'));
		var name    = tag.getAttribute('name');
		var address = _.find(tag.childNodes, function(child) {
			if (_.includes(['address', 'soap:address'], tagType(child))) {
				return child.getAttribute('location');
			}
		});
		_.set(meta, name, {
			namespace : _.get(nsMap, binding.prefix),
			binding   : binding.name,
			address   : address ? address.getAttribute('location') : null
		});
		return meta;
	};
	
	/*
	 * process schema
	 */
	fn.schema = function(tag, ns, isProp, isSeq, isType) {
		console.log('schema', ns, tag.getAttribute('targetNamespace'));
		var meta = {};
		
		if (iequals(tagType(tag.parentNode), 'types') && !isType) {
			return meta;
		}
		
		ns = tag.getAttribute('targetNamespace') || ns;
		meta[ns] = meta[ns] || { _nsMap: tag._nsMap };
		_.merge(meta[ns]._nsMap, tag._nsMap);
		_.merge(meta[ns], fn.expandChildren(tag, ns));
		return meta;
	};
	
	/*
	 * process the wsdl
	 */
	function processWsdl(documents, options, meta) {
		meta = meta || {
			service: {},
			//types: {},
			schema: {}
			//message: {},
			//portType: {},
			//binding: {},
			//operation: {}
		};
		_.forEach(documents, function(doc, docName) {
			console.log(docName);
			var de  = doc.documentElement;
			var tns = de.getAttribute('targetNamespace');
			_.forEach(de._nsMap, function(ns, nsPrefix) {
				_.forEach(_.keys(meta), function(type) {
					_.forEach(doc.getElementsByTagNameNS(ns, type), function(tag) {
						tns = tag.getAttribute('targetNamespace') || tns;
						if (_.has(fn, type)) {
							_.merge(meta[type], fn[type](tag, (nsPrefix === '') ? tns : ns));
						}
					});
				});
			});
		});
		return meta;
	}
	
	
	
	// main function to request and parse the wsdl
	return function(mainWSDL, options) {
		
		var wsdl = {};
		options = options || {};
		
		return getDocument(mainWSDL, options).then(function(documents) {
			wsdl.metadata = processWsdl(documents, options);
			return wsdl;
		});
	};
};