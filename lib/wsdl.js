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
	
	/**
	 * WSDL processing
	 */
	function expandChildren(element, childSchema) {
		_.forEach(element.childNodes, function(child) {
			var childType = _.toLower(tagType(child));
			if (_.has(wsdlTypes, childType)) {
				wsdlTypes[childType](child, childSchema);
			}
		});
	}
	function expandValue(element, childSchema) {
		var name = element.getAttribute('name');
		var type = element.getAttribute('type');
		if (name && type) {
			childSchema.properties[name] = type;
		}
		expandChildren(element, childSchema);
	}
	
	wsdlTypes.complextype    = expandChildren;
	wsdlTypes.simpletype     = expandChildren;
	wsdlTypes.restriction    = expandChildren;
	wsdlTypes.sequence       = expandChildren;
	wsdlTypes.simplecontent  = expandChildren;
	wsdlTypes.complexcontent = expandChildren;
	wsdlTypes.attribute      = expandValue;
	wsdlTypes.element        = expandValue;
	
	wsdlTypes.enumeration = function(element, childSchema) {
		var value = element.getAttribute('value');
		if (value) {
			childSchema.enumeration = true;
			childSchema.properties[value] = value;
		}
		expandChildren(element, childSchema);
	};
	wsdlTypes.extension = function(element, childSchema) {
		childSchema.inherits = element.getAttribute('base');
		expandChildren(element, childSchema);
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
	

	
	
	function createSchemas(documents, options) {
		var schemas = {};
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
							
							if (_.has(wsdlTypes, childType)) {
								wsdlTypes[childType](child, schema[childName], prefix);
							}

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
					var nsType = type.inherits.split(':');
					if (nsType.length > 1 && _.has(ns._ns, nsType[0])) {
						var nsSchema = schemas[ns._ns[nsType[0]]];
						if (_.has(nsSchema, nsType[1])) {
							nsSchema[nsType[1]].extendedBy = nsSchema[nsType[1]].extendedBy || [];
							nsSchema[nsType[1]].extendedBy.push([nsSchema.nsPrefix, name].join(':'));
						}
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

			wsdl.schemas  = createSchemas(documents, options);
			wsdl.services = createServices(documents, options);
			
			return wsdl;
		});
	};
};