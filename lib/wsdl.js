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
	
	
	function createBinding(binding, port, options) {

	}
	
	
	function createPorts(service, options) {
		var ports = {};
		_.forEach(service.getElementsByTagName('port'), function(tag) {
			var portName = tag.getAttribute('name');
			ports[portName] = ports[portName] || {};
			var port = ports[portName];
			_.forEach(tag.attributes, function(attr) {
				if (iequals(attrName(attr), 'binding')) {
					createBinding(attrValue(attr), port, options);
				}
			});
		});
		return ports;
	}
	
	
	function createServices(documents, options) {
		var services = {};
		_.forEach(documents, function(doc) {
			var de  = doc.documentElement;
			_.forEach(_.uniq(_.values(de._nsMap)), function(ns) {
				_.forEach(doc.getElementsByTagNameNS(ns, 'service'), function(tag) {
					var serviceName = tag.getAttribute('name');
					services[serviceName] = services[serviceName] || {
						ports: createPorts(tag, options)
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
	
	function parseMessages(documents, options) {
		var messages = {};
		_.forEach(documents, function(doc, docName) {
			var de  = doc.documentElement;
			var tns = de.getAttribute('targetNamespace');
			_.forEach(_.uniq(_.values(de._nsMap)), function(ns) {
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
			});
		});
		return messages;
	}
	
	function parseOperations(documents, options) {
		var operations = {};
		_.forEach(documents, function(doc, docName) {
			var de  = doc.documentElement;
			var tns = de.getAttribute('targetNamespace');
			_.forEach(_.uniq(_.values(de._nsMap)), function(ns) {
				operations[tns] = operations[tns] || {};
				_.forEach(doc.getElementsByTagNameNS(ns, 'operation'), function(op) {	
					var opName = op.getAttribute('name');
					_.forEach(op.childNodes, function(child) {
						if (tagType(child) === 'input') {
							var inMsg  = child.getAttribute('message');
							if (opName && inMsg) {
								_.set(operations[tns], opName + '.input', inMsg);
							}
						}
						else if (tagType(child) === 'output') {
							var outMsg  = child.getAttribute('message');
							if (opName && outMsg) {
								_.set(operations[tns], opName + '.out', outMsg);
							}
						}
						else if (tagType(child) === 'fault') {
							var faultName = child.getAttribute('name');
							var faultMsg  = child.getAttribute('message');
							if (opName && faultName && faultMsg) {
								_.set(operations[tns], opName + '.faults.' + faultName, faultMsg);
							}
						}
					});
				});
			});
		});
		return operations;
	}
	
	
	function parseSchemas(documents, options) {
		var schemas = _.clone(standardSchemas);
		_.forEach(documents, function(doc, docName) {
			var de  = doc.documentElement;
			_.forEach(_.uniq(_.values(de._nsMap)), function(ns) {
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
			});
		});
		
		// update the schemas with inheritance information
		_.forEach(schemas, function(ns) {
			_.forEach(ns, function(type, name) {
				if (_.has(type, 'inherits')) {
					var nsType = getType(type.inherits, ns);
					if (nsType.obj) {
						nsType.obj.extendedBy = nsType.obj.extendedBy || [];
						nsType.obj.extendedBy.push([nsType.prefix, name].join(':'));
					}
				}
			});
		});
		return schemas;
	}
	
	
	
	// main function to request and parse the wsdl
	return function(mainWSDL, options) {
		
		var wsdl = {};
		options = options || {};
		
		return getDocument(mainWSDL, options).then(function(documents) {

			wsdl.metadata            = {};
			wsdl.metadata.schemas    = parseSchemas(documents, options);
			wsdl.metadata.messages   = parseMessages(documents, options);
			wsdl.metadata.operations = parseOperations(documents, options);
			wsdl.services            = createServices(documents, options);
			
			return wsdl;
		});
	};
};