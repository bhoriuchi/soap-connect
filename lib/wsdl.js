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
	var wsdlTypes = {};
	
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
	
	
	/**
	 * WSDL processing
	 */
	wsdlTypes.expandChildren = function(element, childSchema, prefix) {
		_.forEach(element.childNodes, function(child) {
			wsdlTypes.getChild(tagType(child), child, childSchema, prefix);
		});
	};
	wsdlTypes.expandValue = function(element, childSchema, prefix) {
		var name = element.getAttribute('name');
		var type = element.getAttribute('type');
		if (name && type) {
			childSchema.properties[name] = type;
		}
		wsdlTypes.expandChildren(element, childSchema, prefix);
	};

	wsdlTypes.attribute   = wsdlTypes.expandValue;
	wsdlTypes.element     = wsdlTypes.expandValue;
	
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
	wsdlTypes.getChild = function(type, element, childSchema, prefix) {
		type = _.toLower(type);
		if (_.has(wsdlTypes, type)) {
			wsdlTypes[type](element, childSchema, prefix);
		}
		else {
			wsdlTypes.expandChildren(element, childSchema, prefix);
		}
	};
	
	/**
	 * Document retrieval
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
	
	
	function createPorts(service, options, wsdl) {
		var ports = {};
		_.forEach(service.getElementsByTagName('port'), function(tag) {
			var nsMap       = tag.ownerDocument.documentElement._nsMap;
			var portName    = tag.getAttribute('name');
			ports[portName] = ports[portName] || {};
			var port        = ports[portName];
			var binding     = tag.getAttribute('binding');
			
			if (binding) {				
				binding = binding.split(':');
				if (binding.length > 1) {
					var bindingNs   = _.get(nsMap, binding[0]);
					var bindingName = binding[1];
					
				}
			}
		});
		return ports;
	}
	
	
	function createServices(documents, options, wsdl) {
		var services = {};
		_.forEach(documents, function(doc) {
			var de  = doc.documentElement;
			_.forEach(_.uniq(_.values(de._nsMap)), function(ns) {
				_.forEach(doc.getElementsByTagNameNS(ns, 'service'), function(tag) {
					var serviceName = tag.getAttribute('name');
					services[serviceName] = services[serviceName] || {
						ports: createPorts(tag, options, wsdl)
					};
					var service = services[serviceName];
					_.forEach(tag.attributes, function(attr) {
						if (!iequals(attrName(attr), 'name')) {
							service = attrValue(attr);
						}
					});
				});
			});			
		});
		return services;
	}
	
	function parseMessages(doc, ns, tns, options, messages) {
		messages[tns] = messages[tns] || {};
		_.forEach(doc.getElementsByTagNameNS(ns, 'message'), function(msg) {
			var msgName = msg.getAttribute('name');
			_.forEach(msg.childNodes, function(child) {
				if (tagType(child) === 'part') {
					var partName = child.getAttribute('name');
					var partElem = child.getAttribute('element');
					if (msgName && partName && partElem) {
						_.set(messages[tns], msgName + '.parts.' + partName, partElem);
					}
				}
			});
		});
		return messages;
	}
	
	function parseSchemas(doc, ns, options, schemas) {
		schemas = schemas || _.clone(standardSchemas);
		_.forEach(doc.getElementsByTagNameNS(ns, 'schema'), function(tag) {
			
			var tns      = tag.getAttribute('targetNamespace');
			schemas[tns] = schemas[tns] || {};
			var schema   = schemas[tns];
			
			_.forEach(tag.attributes, function(attr) {
				if (attrName(attr).match(/^xmlns\:/i)) {
					schema._ns = schema._ns || {};
					schema._ns[attrName(attr).replace(/^xmlns\:/i, '')] = attrValue(attr);
				}
			});
			
			var prefix = _.findKey(schema._ns, function(v) {
				return v === tns;
			});
			schema.nsPrefix = prefix;
			
			_.forEach(tag.childNodes, function(child) {
				
				var childType = _.toLower(tagType(child));
				var childName = child.getAttribute ? child.getAttribute('name') : null;
				
				if (childName && childType) {
					
					var type = child.getAttribute('type') || [prefix, childName].join(':');
					schema[childName] = schema[childName] || {};
					var element = schema[childName];
					schema[childName].properties = schema[childName].properties || {};
					wsdlTypes.getChild(childType, child, schema[childName], prefix);

					_.forEach(child.attributes, function(attr) {
						if (!iequals(attrName(attr), 'name')) {
							element[attrName(attr)] = attrValue(attr);
						}
					});
				}
			});
		});
		return schemas;
	}
	
	
	function parsePortTypes(doc, ns, options, portTypes) {
		portTypes = portTypes || {};
		_.forEach(doc.getElementsByTagNameNS(ns, 'portType'), function(tag) {
			var portName = tag.getAttribute('name');
			portTypes[portName] = { operations: {} };
			var ops = portTypes[portName].operations;
			_.forEach(tag.childNodes, function(child) {
				var childType = _.toLower(tagType(child));
				var childName = child.getAttribute ? child.getAttribute('name') : null;
				
				if (childName && childType === 'operation') {
					ops[childName] = {};
					_.forEach(child.childNodes, function(opChild) {
						if (_.toLower(tagType(opChild)) === 'input') {
							ops[childName].input = opChild.getAttribute('message');
						}
						else if (_.toLower(tagType(opChild)) === 'output') {
							ops[childName].input = opChild.getAttribute('message');
						}
						else if (_.toLower(tagType(opChild)) === 'fault') {
							ops[childName].faults = ops[childName].faults || {};
							ops[childName].faults[opChild.getAttribute('name')] = opChild.getAttribute('message');
						}
					});
				}
			});
		});
		return portTypes;
	}
	
	
	function parseBindings(doc, ns, options, bindings) {
		bindings = bindings || {};
		_.forEach(doc.getElementsByTagNameNS(ns, 'binding'), function(tag) {
			var bindingName = tag.getAttribute('name');
			var bindingType = tag.getAttribute('type');
			
			/*
			bindings[bindingName] = { operations: {} };
			var ops = binding[bindingName].operations;
			_.forEach(tag.childNodes, function(child) {
				var childType = _.toLower(tagType(child));
				var childName = child.getAttribute ? child.getAttribute('name') : null;
				
				if (childName && childType === 'operation') {
					ops[childName] = {};
					_.forEach(child.childNodes, function(opChild) {
						if (_.toLower(tagType(opChild)) === 'input') {
							ops[childName].input = opChild.getAttribute('message');
						}
						else if (_.toLower(tagType(opChild)) === 'output') {
							ops[childName].input = opChild.getAttribute('message');
						}
						else if (_.toLower(tagType(opChild)) === 'fault') {
							ops[childName].faults = ops[childName].faults || {};
							ops[childName].faults[opChild.getAttribute('name')] = opChild.getAttribute('message');
						}
					});
				}
			});
			*/
		});
		return bindings;
	}
	
	
	function parseWsdl(documents, options, meta) {
		meta = meta || {
			schemas: {},
			messages: {},
			portTypes: {}
		};
		_.forEach(documents, function(doc, docName) {
			var de  = doc.documentElement;
			var tns = de.getAttribute('targetNamespace');
			_.forEach(_.uniq(_.values(de._nsMap)), function(ns) {
				parseSchemas(doc, ns, options, meta.schemas);
				parseMessages(doc, ns, tns, options, meta.messages);
				parsePortTypes(doc, ns, options, meta.portTypes);
			});
		});
		return meta;
	}
	
	
	
	// main function to request and parse the wsdl
	return function(mainWSDL, options) {
		
		var wsdl = {};
		options = options || {};
		
		return getDocument(mainWSDL, options).then(function(documents) {

			wsdl.metadata            = parseWsdl(documents, options);
			wsdl.services            = createServices(documents, options, wsdl);
			
			return wsdl;
		});
	};
};