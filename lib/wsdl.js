/**
 * SOAP Connect
 * 
 * @author Branden Horiuchi <bhoriuchi@gmail.com>
 * @license MIT
 * 
 */
module.exports = function(env) {
	
	var emitter      = new env.events.EventEmitter();
	var url          = env.url;
	var xmldom       = env.xmldom;
	var _            = env.lodash;
	var request      = env.request;
	var Promise      = env.promise;
	var localStorage = env.localStorage;
	var fn           = {};
	var xmlenc       = '<?xml version="1.0" encoding="utf-8"?>';
	// soap versions
	var soap = {
		'http://schemas.xmlsoap.org/wsdl/soap/': {
			envelope: 'http://schemas.xmlsoap.org/soap/envelope/',
			httpTransport: 'http://schemas.xmlsoap.org/soap/http'
		},
		'http://schemas.xmlsoap.org/wsdl/soap12/': {
			envelope: 'http://www.w3.org/2003/05/soap-envelope',
			httpTransport: 'http://schemas.xmlsoap.org/soap/http'
		}
	};
	

	// define standard schemas types
	var w3 = {
		'http://www.w3.org/2001/XMLSchema': {
			'anyType': function(obj) {
				return obj;
			},
			'string': function(obj) {
				return _.toString(obj);
			},
			'normalizedString': function(obj) {
				return _.toString(obj).replace(/[\n\r\t]/g, ' ');
			},
			'token': function(obj) {
				return _.toString(obj).replace(/\s+/g, ' ').trim();
			},
			'boolean': function(obj) {
				obj = _.toLower(_.toString(obj));
				return (obj === 'true' || obj === '1') ? true : false;
			},
			'byte': function(obj) {
				return _.toString(obj);
			},
			'decimal': function(obj) {
				return _.toNumber(obj);
			},
			'float': function(obj) {
				return _.toNumber(obj);
			},
			'double': function(obj) {
				return _.toNumber(obj);
			},
			'int': function(obj) {
				return _.toNumber(obj);
			},
			'integer': function(obj) {
				return _.toNumber(obj);
			},
			'long': function(obj) {
				return _.toNumber(obj);
			},
			'negativeInteger': function(obj) {
				return _.toNumber(obj);
			},
			'nonNegativeInteger': function(obj) {
				return _.toNumber(obj);
			},
			'nonPositiveInteger': function(obj) {
				return _.toNumber(obj);
			},
			'positiveInteger': function(obj) {
				return _.toNumber(obj);
			},
			'short': function(obj) {
				return _.toNumber(obj);
			},
			'unsignedLong': function(obj) {
				return _.toNumber(obj);
			},
			'unsignedInt': function(obj) {
				return _.toNumber(obj);
			},
			'unsignedShort': function(obj) {
				return _.toNumber(obj);
			},
			'unsignedByte': function(obj) {
				return _.toNumber(obj);
			},
			'duration': function(obj) {
				return _.toString(obj);
			},
			'dateTime': function(obj) {
				return new Date(obj);
			},
			'time': function(obj) {
				return new Date(obj);
			},
			'date': function(obj) {
				return new Date(obj);
			},
			'base64Binary': function(obj) {
				return _.toString(obj);
			},
			'hexBinary': function(obj) {
				return _.toString(obj);
			}
		}
	};
	
	
	/**
	 * utility functions
	 */
	function isMeta(val, metaPrefix) {
		return val.substring(0, metaPrefix.length) === metaPrefix;
	}
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
		var type = tag.tagName || tag.nodeName;
		return type.replace(/^wsdl\:/i, '');
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
	 * Document load
	 */
	function loadDocument(uri, opt, documents) {
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
						return loadDocument(lookupURI, opt, documents);
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
	
	/**
	 * WSDL processing
	 */
	fn.getChild = function(type, tag, ns, opt) {
		type = _.toLower(type);
		if (_.has(fn, type)) {
			return fn[type](tag, ns, opt);
		}
		else {
			return fn.expandChildren(tag, ns, opt);
		}
	};
	fn.expandChildren = function(tag, ns, opt) {
		var meta = {};
		_.forEach(tag.childNodes, function(child) {
			_.merge(meta, fn.getChild(tagType(child), child, ns, opt));
		});
		return meta;
	};
	fn.expandValue = function(tag, ns, opt) {
		var meta   = {};
		var name   = tag.getAttribute('name');
		meta[name] = meta[name] || {};
		_.forEach(tag.attributes, function(attr) {
			if (!iequals(attrName(attr), 'name')) {
				var aname = attrName(attr);
				aname     = _.includes(['type'], aname) ? opt.$$ + aname : aname;
				meta[name][aname] = attrValue(attr);
			}
		});
		_.merge(meta[name], fn.expandChildren(tag, ns, opt));
		return meta;
	};
	fn.expandNamed = function(tag, ns, opt) {
		var meta    = {};
		var name    = tag.getAttribute('name');
		var tns     = tag.getAttribute('targetNamespace');
		ns          = tns ? tns : ns;
		_.set(meta, ns + '.' + name, {});
		_.merge(meta[ns][name], fn.expandChildren(tag, ns, opt));
		return meta;
	};
	fn.getType = function(tag, ns, opt) {
		var meta = {};
		var name = tag.getAttribute('name');
		if (name) {
			_.set(meta, name, fn.expandChildren(tag, ns, opt));
		}
		else {
			meta = fn.expandChildren(tag, ns, opt);
		}
		return meta;
	};
	fn.getFlag = function(tag, ns, opt) {
		var meta = {};
		meta[opt.$$ + tagType(tag)] = true;
		_.merge(meta, fn.expandChildren(tag, ns, opt));
		return meta;
	};


	fn.restriction = function(tag, ns, opt) {
		var meta = {};
		meta[opt.$$ + 'restriction'] = tag.getAttribute('base');
		_.merge(meta, fn.expandChildren(tag, ns, opt));
		return meta;
	};
	
	fn.enumeration = function(tag, ns, opt) {
		var meta  = {};
		var value = tag.getAttribute('value');
		meta[opt.$$ + 'enumeration'] = true;
		meta[value] = value;
		_.merge(meta, fn.expandChildren(tag, ns, opt));
		return meta;
	};

	fn.extension = function(tag, ns, opt) {
		var meta = {};
		meta[opt.$$ + 'inherits'] = tag.getAttribute('base');
		_.merge(meta, fn.expandChildren(tag, ns, opt));
		return meta;
	};

	/*
	 * process message
	 */
	fn.message = function(tag, ns, opt) {
		var meta = {};
		var name = tag.getAttribute('name');
		_.set(meta, ns + '.' + name, {});
		_.merge(meta[ns][name], fn.expandChildren(tag, ns, opt));
		return meta;
	};
	/*
	 * process part
	 */
	fn.part = function(tag, ns, opt) {
		var meta = {};
		var name = tag.getAttribute('name');
		meta[name] = tag.getAttribute('element');
		return meta;
	};
	/*
	 * process operation
	 */
	fn.operation = function(tag, ns, opt) {
		var meta = {};
		var name = tag.getAttribute('name');
		meta[name] = {};
		_.merge(meta[name], fn.expandChildren(tag, ns, opt));
		return meta;
	};
	
	/*
	 * process input
	 */
	fn.input = function(tag, ns, opt) {
		var meta = { input: {} };
		var message = tag.getAttribute('message');
		if (message) {
			meta.input.message = message;
		}
		_.merge(meta.input, fn.expandChildren(tag, ns, opt));
		return meta;
	};
	fn.output = function(tag, ns, opt) {
		var meta = { output: {} };
		var message = tag.getAttribute('message');
		if (message) {
			meta.output.message = message;
		}
		_.merge(meta.output, fn.expandChildren(tag, ns, opt));
		return meta;
	};
	fn.fault = function(tag, ns, opt) {
		var meta    = {};
		var name    = tag.getAttribute('name');
		var message = tag.getAttribute('message');
		_.set(meta, 'fault.' + name, {});
		if (message) {
			meta.fault[name].message = message;
		}
		_.merge(meta.fault[name], fn.expandChildren(tag, ns, opt));
		return meta;
	};
	
	
	/*
	 * process ports
	 */
	fn.port = function(tag, ns, opt) {
		var meta     = {};
		var nsMap    = _.get(tag, 'ownerDocument.documentElement._nsMap');
		var name     = tag.getAttribute('name');
		var location = _.find(tag.childNodes, function(child) {
			if (_.includes(['address', 'soap:address'], tagType(child))) {
				return child.getAttribute('location');
			}
		});
		meta[name] = meta[name] || { _nsMap: {} };
		_.merge(meta[name]._nsMap, nsMap);
		meta[name][opt.$$ + 'binding']   = tag.getAttribute('binding');
		meta[name][opt.$$ + 'location']  = location ? location.getAttribute('location') : null;
		return meta;
	};
	
	/*
	 * process schema
	 */
	fn.schema = function(tag, ns, opt) {
		//console.log('schema', ns, tag.getAttribute('targetNamespace'));
		var meta = {};
		ns = tag.getAttribute('targetNamespace') || ns;
		meta[ns] = meta[ns] || { _nsMap: tag._nsMap };
		_.merge(meta[ns]._nsMap, tag._nsMap);
		_.merge(meta[ns], fn.expandChildren(tag, ns, opt));
		return meta;
	};
	
	/*
	 * process binding
	 */
	fn.binding = function(tag, ns, opt) {
		if (ns.indexOf('.') !== -1) {
			return {};
		}
		var meta  = {};
		var nsMap = _.get(tag, 'ownerDocument.documentElement._nsMap');
		var name  = tag.getAttribute('name');
		var type  = tag.getAttribute('type');
		_.set(meta, ns + '.' + name, {});
		meta[ns]._nsMap = nsMap;
		meta[ns][name][opt.$$ + 'type'] = type;
		_.merge(meta[ns][name], fn.expandChildren(tag, ns, opt));
		return meta;
	};
	
	/*
	 * process soap:binding
	 */
	fn['soap:binding'] = function(tag, ns, opt) {
		var meta              = {};
		var $soap             = opt.$$ + 'soap';
		meta[$soap]           = {};
		meta[$soap].style     = tag.getAttribute('style');
		meta[$soap].transport = tag.getAttribute('transport');
		_.merge(meta, fn.expandChildren(tag, ns, opt));
		return meta;
	};
	
	/*
	 * procecss soap:operation
	 */
	fn['soap:operation'] = function(tag, ns, opt) {
		var meta               = {};
		var $soap              = opt.$$ + 'soap';
		meta[$soap]            = {};
		meta[$soap].style      = tag.getAttribute('style');
		meta[$soap].soapAction = tag.getAttribute('soapAction');
		_.merge(meta, fn.expandChildren(tag, ns, opt));
		return meta;
	};
	
	/*
	 * process soap:body
	 */
	fn['soap:body'] = function(tag, ns, opt) {
		var meta        = {};
		var $soap       = opt.$$ + 'soap';
		meta[$soap]     = {};
		meta[$soap].use = tag.getAttribute('use');
		_.merge(meta, fn.expandChildren(tag, ns, opt));
		return meta;
	};
	
	/*
	 * process soap:fault
	 */
	fn['soap:fault'] = function(tag, ns, opt) {
		var meta         = {};
		var $soap        = opt.$$ + 'soap';
		meta[$soap]      = {};
		meta[$soap].name = tag.getAttribute('name');
		meta[$soap].use  = tag.getAttribute('use');
		_.merge(meta, fn.expandChildren(tag, ns, opt));
		return meta;
	};
	
	
	//TODO: add attributeGroup handling
	
	
	// duplicate processing types
	fn.types        = fn.expandChildren;
	fn.service      = fn.expandNamed;
	fn.portType     = fn.expandNamed;
	fn.element      = fn.expandValue;
	fn.attribute    = fn.expandValue;
	fn.complextype  = fn.getType;
	fn.simpletype   = fn.getType;
	fn.sequence     = fn.getFlag;
	fn.choice       = fn.getFlag;
	fn.all          = fn.getFlag;
	fn.anyattribute = fn.getFlag;
	
	/*
	 * process the wsdl
	 */
	function processWsdl(documents, opt, meta) {
		
		var $soap = opt.$$ + 'soap';
		var nsMap = {};
		
		meta = meta || {
			service: {},
			schema: {},
			message: {},
			portType: {},
			binding: {},
		};
		_.forEach(documents, function(doc, docName) {
			console.log(docName);
			var de  = doc.documentElement;
			_.merge(nsMap, de._nsMap);
			var tns = de.getAttribute('targetNamespace');
			_.forEach(de._nsMap, function(ns, nsPrefix) {
				_.forEach(_.keys(meta), function(type) {
					_.forEach(doc.getElementsByTagNameNS(ns, type), function(tag) {
						tns = tag.getAttribute('targetNamespace') || tns;
						if (_.has(fn, type)) {
							_.merge(meta[type], fn[type](tag, (nsPrefix === '') ? tns : ns, opt));
						}
					});
				});
			});
		});
		meta._nsMap = nsMap;

		// combine portType and binding operations
		_.forEach(meta.binding, function(binding, ns) {
			_.forEach(_.omit(binding, ['_nsMap', '']), function(b, name) {
				var type      = nsplit(b[opt.$$ + 'type']);
				var typeNs    = _.get(binding._nsMap, type.prefix);
				_.merge(b, _.get(meta.portType, typeNs + '.' + type.name));
			});
		});
		
		// connect ports with their bindings
		_.forEach(meta.service, function(tns, tnsName) {
			_.forEach(tns, function(svc, svcName) {
				_.forEach(svc, function(port, portName) {
					var binding     = nsplit(port[opt.$$ + 'binding']);
					var ns          = _.get(port._nsMap, binding.prefix) || tns;
					port.operations = _.get(meta.binding, ns + '.' + binding.name) || null;
					port.operations[opt.$$ + 'namespace'] = ns;
				});
			});
		});
		
		// return the summarized metadata
		return _.omit(meta, ['portType', 'binding']);
	}
	
	// retrieve the metadata either from cache or by processing the wsdl
	function getMetadata(mainWSDL, options) {
		var cache          = new localStorage.LocalStorage('./.localStroage');
		var metadata       = cache.getItem(mainWSDL);
		
		// if cache is not set to false and metadata was found, return a promise
		// with the parsed metadata
		if (options.cache !== false && metadata) {
			return new Promise(function(resolve, reject) {
				resolve(JSON.parse(metadata));
			});
		}
		
		// otherwise process the metadata from the wsdl
		return loadDocument(mainWSDL, options).then(function(documents) {
			metadata = processWsdl(documents, options);
			cache.setItem(mainWSDL, JSON.stringify(metadata));
			return metadata;
		});
	}
	
	// create a type object
	function createType(type, wsdl, ns, nsMap, opt) {
		var schema    = _.get(wsdl._meta.schema, ns);
		return function(obj, seen) {
			obj           = obj  || undefined;
			seen          = seen || [];
			var objSchema = _.get(schema, type);
			var skel      = {};
			var inherit   = _.get(objSchema, opt.$$ + 'inherits');
			
			// check for enums
			if ( _.get(objSchema, opt.$$ + 'enumeration') === true) {
				var enums = _.omitBy(objSchema, function(v, k) {
					return isMeta(k, opt.$$);
				});
				if (obj === undefined) {
					return enums;
				}
				else if (_.has(enums, obj)) {
					var enumRestriction = _.get(objSchema, opt.$$ + 'restriction');
					if (enumRestriction) {
						var r = nsplit(enumRestriction);
						var rfn = _.get(wsdl, [r.prefix, r.name].join('.'));
						if (_.isFunction(rfn)) {
							return rfn(obj);
						}
					}
					return obj;
				}
				return undefined;
			}
			
			// check for inherits and add them
			if (inherit) {
				var i   = nsplit(inherit);
				var ifn = _.get(wsdl, [i.prefix, i.name].join('.'));
				if (_.isFunction(ifn)) {
					skel = ifn(obj, _.clone(seen));
				}
			}
			
			// loop through each field and add it
			_.forEach(objSchema, function(v, k) {
				if (!isMeta(k, opt.$$)) {
					var _type   = v[opt.$$ + 'type'];

					if (_type) {
						var tfn, t = nsplit(_type);
						var vNs    = _.get(nsMap,t.prefix);
						var cObj   = _.get(obj, k) || undefined;
						
						if (_.has(w3, vNs)) {
							tfn = _.get(w3[vNs], t.name);
							
							if (_.isFunction(tfn) && cObj !== undefined) {
								skel[k] = tfn(cObj, t.prefix);
							}
							else if (obj === undefined) {
								skel[k] = _type;
							}
						}
						else {
							tfn = _.get(wsdl, [t.prefix, t.name].join('.'));
							
							if (_.includes(seen, _type)) {
								skel[k] = _type;
							}
							else if (_.isFunction(tfn)) {
								if (obj === undefined) {
									seen.push(_type);
									skel[k] = tfn(undefined, _.clone(seen));	
								}
								else if (cObj) {
									skel[k] = tfn(cObj, _.clone(seen));
								}
							}
							else {
								skel[k] = [t.prefix, t.name].join(':');
							}
						}
					}
					else if (obj === undefined) {
						console.log('no type');
						skel[k] = _type;
					}
				}
			});
			return skel;
		};
	}
	
	function serialize(doc, element, ns, prefix, args) {
		_.forEach(args, function(v, k) {
			var e = doc.createElementNS(ns, [prefix, k].join(':'));
			if (_.isObject(v)) {
				serialize(doc, e, ns, prefix, v);
			}
			else {
				e.appendChild(doc.createTextNode(v));
			}
			
			element.appendChild(e);
		});
	}
	
	
	function createMethod11(name, wsdl, ns, port, opt) {
		return function(args) {
			var msgstr     = '';
			var op         = _.get(port, 'operations.' + name);
			var ns         = _.get(port, 'operations.' + opt.$$ + 'namespace') || ns;
			var nsParts    = nsplit(ns);
			var serializer = new xmldom.XMLSerializer();
			var dom        = new xmldom.DOMImplementation();
			var doc        = dom.createDocument(ns);
			var encoding   = doc.createElement();
			var envelope   = doc.createElementNS(ns, 'soapenv:Envelope');
			var body       = doc.createElementNS(ns, 'soapenv:Body');
			var method     = doc.createElementNS(ns, [nsParts.prefix, name].join(':'));
			
			// generate endpoint url
			var wsdlPath = new RegExp(url.parse(opt.mainWSDL).path + '$');
			var srvcPath = url.parse(port[opt.$$ + 'location']).path;
			
			var endpoint   = opt.mainWSDL.replace(wsdlPath, srvcPath);
			envelope.setAttributeNS(ns, 'xmlns:soapenv', 'http://schemas.xmlsoap.org/soap/envelope/');
			envelope.setAttributeNS(ns, ['xmlns', nsParts.prefix].join(':'), ns);
			var input = nsplit(_.get(op, 'input.message'));
			var inNs  = wsdl._meta._nsMap[input.prefix || ns];
			var inMsg = _.get(wsdl._meta.message, [inNs, input.name, 'parameters'].join('.'));
			serialize(doc, method, ns, nsParts.prefix, args);
			body.appendChild(method);
			envelope.appendChild(doc.createElementNS(ns, 'soapenv:Header'));
			envelope.appendChild(body);
			doc.appendChild(envelope);
			msgstr = xmlenc + serializer.serializeToString(doc);
			
			console.log(endpoint, msgstr);
			
			request({
				uri: endpoint,
				method: 'POST',
				body: msgstr
			}, function(error, response, body) {
				if (!error) {
					console.log(body);
				}
			});
		};
	}
	function createMethod12(name, wsdl, ns, port, opt) {
		
	}
	
	function createMethod(name, wsdl, ns, port, opt) {
		if (_.get(port._nsMap, 'soap') === 'http://schemas.xmlsoap.org/wsdl/soap/') {
			return createMethod11(name, wsdl, ns, port, opt);
		}
		else if (_.get(port._nsMap, 'soap') === 'http://schemas.xmlsoap.org/wsdl/soap12/') {
			return createMethod12(name, wsdl, ns, port, opt);
		}
	}
	
	
	function buildMethods(wsdl, opt) {
		_.forEach(wsdl._meta.service, function(tns, tnsName) {
			var ns = nsplit(tnsName);
			_.forEach(tns, function(svc, svcName) {
				_.forEach(svc, function(port, portName) {
					_.forEach(port.operations, function(op, opName) {
						if (!isMeta(opName, opt.$$)) {
							_.set(wsdl, [ns.name, svcName, portName, opName].join('.'), createMethod(opName, wsdl, tnsName, port, opt));
						}
					});
				});				
			});
		});
	}
	
	function buildTypes(wsdl, opt) {
		_.forEach(wsdl._meta.schema, function(tns, tnsName) {
			var ns = nsplit(tnsName);
			_.forEach(_.omit(tns, '_nsMap'), function(type, typeName) {
				_.set(wsdl, [ns.name, typeName].join('.'), createType(typeName, wsdl, tnsName, tns._nsMap, opt));
			});
		});
	}
	
	
	function buildServices(wsdl) {
		_.forEach(wsdl._meta.service, function(tns, tnsName) {
			_.forEach(tns, function(svc, svcName) {
				_.forEach(svc, function(port, portName) {
					_.forEach(port.operations, function(op, opName) {
						_.set(wsdl, [svcName, portName, opName].join('.'), {});
					});
				});
			});
		});
	}
	
	// main function to request and parse the wsdl
	return function(mainWSDL, options) {
		
		var wsdl           = {};
		options            = options || {};
		options.mainWSDL   = mainWSDL;
		options.metaPrefix = options.metaPrefix || '$$';
		options.$$         = options.metaPrefix;
		
		return getMetadata(mainWSDL, options).then(function(metadata) {
			wsdl._meta = metadata;
			buildTypes(wsdl, options);
			buildMethods(wsdl, options);
			//return metadata;
			return wsdl;
		});
	};
};