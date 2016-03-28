/**
 * SOAP Connect
 * 
 * @author Branden Horiuchi <bhoriuchi@gmail.com>
 * @license MIT
 * 
 */
module.exports = function(env) {
	
	var u  = env.utils;

	var url          = env.url;
	var xmldom       = env.xmldom;
	var _            = env.lodash;
	var request      = env.request;
	var Promise      = env.promise;
	var localStorage = env.localStorage;
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
	
	var fn = {
		'http://schemas.xmlsoap.org/wsdl/'        : {},
		'http://schemas.xmlsoap.org/wsdl/soap/'   : {},
		'http://schemas.xmlsoap.org/wsdl/soap12/' : {},
		'http://schemas.xmlsoap.org/wsdl/mime/'   : {},
		'http://schemas.xmlsoap.org/wsdl/http/'   : {},
		'http://www.w3.org/2001/XMLSchema'        : {},
		'TAG'                                     : {},
		''                                        : {}
	};
	var fnWSDL   = fn['http://schemas.xmlsoap.org/wsdl/'];
	var fnSOAP   = fn['http://schemas.xmlsoap.org/wsdl/soap/'];
	var fnSOAP12 = fn['http://schemas.xmlsoap.org/wsdl/soap12/'];
	var fnHTTP   = fn['http://schemas.xmlsoap.org/wsdl/http/'];
	var fnMIME   = fn['http://schemas.xmlsoap.org/wsdl/mime/'];
	var fnXML    = fn['http://www.w3.org/2001/XMLSchema'];
	var fnTAG    = fn.TAG;
	
	
	// define standard schemas types
	function w3(prefix) {
		return {
			'anyType': function(obj) {
				if (!obj) { return prefix + ':anyType'; }
				return obj;
			},
			'string': function(obj) {
				if (!obj) { return prefix + ':string'; }
				return _.toString(obj);
			},
			'normalizedString': function(obj) {
				if (!obj) { return prefix + ':normalizedString'; }
				return _.toString(obj).replace(/[\n\r\t]/g, ' ');
			},
			'token': function(obj) {
				if (!obj) { return prefix + ':token'; }
				return _.toString(obj).replace(/\s+/g, ' ').trim();
			},
			'boolean': function(obj) {
				if (!obj) { return prefix + ':boolean'; }
				obj = _.toLower(_.toString(obj));
				return (obj === 'true' || obj === '1') ? true : false;
			},
			'byte': function(obj) {
				if (!obj) { return prefix + ':byte'; }
				return _.toString(obj);
			},
			'decimal': function(obj) {
				if (!obj) { return prefix + ':decimal'; }
				return _.toNumber(obj);
			},
			'float': function(obj) {
				if (!obj) { return prefix + ':float'; }
				return _.toNumber(obj);
			},
			'double': function(obj) {
				if (!obj) { return prefix + ':double'; }
				return _.toNumber(obj);
			},
			'int': function(obj) {
				if (!obj) { return prefix + ':int'; }
				return _.toNumber(obj);
			},
			'integer': function(obj) {
				if (!obj) { return prefix + ':integer'; }
				return _.toNumber(obj);
			},
			'long': function(obj) {
				if (!obj) { return prefix + ':long'; }
				return _.toNumber(obj);
			},
			'negativeInteger': function(obj) {
				if (!obj) { return prefix + ':negativeInteger'; }
				return _.toNumber(obj);
			},
			'nonNegativeInteger': function(obj) {
				if (!obj) { return prefix + ':nonNegativeInteger'; }
				return _.toNumber(obj);
			},
			'nonPositiveInteger': function(obj) {
				if (!obj) { return prefix + ':nonPositiveInteger'; }
				return _.toNumber(obj);
			},
			'positiveInteger': function(obj) {
				if (!obj) { return prefix + ':positiveInteger'; }
				return _.toNumber(obj);
			},
			'short': function(obj) {
				if (!obj) { return prefix + ':short'; }
				return _.toNumber(obj);
			},
			'unsignedLong': function(obj) {
				if (!obj) { return prefix + ':unsignedLong'; }
				return _.toNumber(obj);
			},
			'unsignedInt': function(obj) {
				if (!obj) { return prefix + ':unsignedInt'; }
				return _.toNumber(obj);
			},
			'unsignedShort': function(obj) {
				if (!obj) { return prefix + ':unsignedShort'; }
				return _.toNumber(obj);
			},
			'unsignedByte': function(obj) {
				if (!obj) { return prefix + ':unsignedByte'; }
				return _.toNumber(obj);
			},
			'duration': function(obj) {
				if (!obj) { return prefix + ':duration'; }
				return _.toString(obj);
			},
			'dateTime': function(obj) {
				if (!obj) { return prefix + ':dateTime'; }
				return new Date(obj);
			},
			'time': function(obj) {
				if (!obj) { return prefix + ':time'; }
				return new Date(obj);
			},
			'date': function(obj) {
				if (!obj) { return prefix + ':date'; }
				return new Date(obj);
			},
			'base64Binary': function(obj) {
				if (!obj) { return prefix + ':base64Binary'; }
				return _.toString(obj);
			},
			'hexBinary': function(obj) {
				if (!obj) { return prefix + ':hexBinary'; }
				return _.toString(obj);
			}
		};
	}

	
	/**
	 * Document load
	 */
	function loadDocument(args) {
		args.meta   = args.meta   || {};
		args.loaded = args.loaded || [];
		
		// check if the document has already been processed
		if (!_.includes(args.loaded, args.uri)) {
			
			// signal a load start
			args.emitter.emit('wsdl.load.start', args.uri);
			
			// get the document
			request(args.uri, function(err, response, body) {
				
				// get the base URI
				args.baseURI = args.uri.substring(0, args.uri.lastIndexOf('/')) + '/';
				
				// check for errors
				if (err || response.statusCode !== 200) {
					return args.emitter.emit('wsdl.load.error', err || body || response);
				}
				
				// parse the document
				args.element = new xmldom.DOMParser().parseFromString(body);

				// if all is successful, add the URI to the loaded array
				args.loaded.push(args.uri);
				
				// process the document children
				fn.processChildren(args);
				
				// return the metadata in the callback
				args.emitter.emit('wsdl.load.complete', args.uri);
			});
		}
	}
	
	/*
	 * generic child node processor
	 */
	fn.processChildren = function(args) {
		_.forEach(args.element.childNodes, function(child) {
			var tag = u.getTag(child);
			var nsMap = args.nsMap || _.get(args.element, 'documentElement._nsMap') ||
						_.get(args.element, 'ownerDocument.documentElement._nsMap');
			var xmlns = tag.namespaceURI || _.get(nsMap, tag._prefix) || 'TAG';

			if (tag && _.isFunction(_.get(fn[xmlns], tag._name))) {
				fn[xmlns][tag._name](_.defaults({element: tag}, args));
			}
			else if (tag && !_.includes(['message', '#comment', '#text'], tag._name)) {
				console.log('no processor for ', [tag._prefix, tag._name].join(':'), u.cleanTag(tag));
			}
			else if (tag.childNodes) {
				_.forEach(tag.childNodes, function(grandChild) {
					fn.processChildren(_.defaults({element: u.getTag(grandChild)}, args));
				});
			}
		});
	};
	
	/*
	 * Tag processor
	 */
	fnTAG.xml = function(args) {
		var data  = _.get(args.element, 'nodeValue') || _.get(args.element, 'data');
		args.root[args.options.$$('doctype')] = '<?xml ' + data + '?>';
	};
	
	/*
	 * WSDL Processors
	 */
	fnWSDL.service = function(args) {
		var tns = u.setObj(u.setObj(args.root, 'services'), args.tns);
		tns[args.$$('nsMap')] = args._nsMap;
		var svc = u.setObj(tns, args.element.getAttribute('name'));
		fn.processChildren(_.defaults({meta: svc}, args));
	};
	
	fnWSDL.port = function(args) {
		var port = u.setObj(args.meta, args.element.getAttribute('name'));
		port[args.$$('binding')] = args.element.getAttribute('binding');
		fn.processChildren(_.defaults({meta: port}, args));
	};
	
	fnWSDL.definitions = function(args) {
		var tag   = args.element;
		var tns   = tag.getAttribute('targetNamespace') || args.tns || _.get(tag, '_nsMap.' + tag.prefix);
		fn.processChildren(_.defaults({tns: tns, _nsMap: _.get(tag, '_nsMap')}, args));
	};
	
	fnWSDL.import = function(args) {
		var tag   = args.element;
		var ns    = tag.getAttribute('namespace');
		var loc   = tag.getAttribute('location') || tag.getAttribute('schemaLocation');
		var uri   = u.getURI(loc, args.baseURI);
		loadDocument(_.defaults({uri: uri, tns: ns}, args));
	};

	fnWSDL.include = function(args) {
		var tag   = args.element;
		var loc   = tag.getAttribute('location') || tag.getAttribute('schemaLocation');
		var uri   = u.getURI(loc, args.baseURI);
		loadDocument(_.defaults({uri: uri}, args));
	};

	fnWSDL.types = function(args) {
		args.root.types = args.root.types || {};
		fn.processChildren(_.defaults({meta: args.root.types}, args));
	};
	
	fnWSDL.part = function(args) {
		var tag  = args.element;
		var name = tag.getAttribute('name');
		args.meta[name] = tag.getAttribute('type') || tag.getAttribute('element');
	};
	
	fnWSDL.message = function(args) {
		var msg = u.setObj(u.setObj(u.setObj(args.root, 'messages'), args.tns), args.element.getAttribute('name'));
		fn.processChildren(_.defaults({meta: msg}, args));
	};
	
	fnWSDL.portType = function(args) {
		var pt = u.setObj(u.setObj(u.setObj(args.root, 'portTypes'), args.tns), args.element.getAttribute('name'));
		pt[args.$$('namespace')] = args.tns;
		fn.processChildren(_.defaults({meta: pt}, args));
	};
	
	fnWSDL.operation = function(args) {
		var op = u.setObj(args.meta, args.element.getAttribute('name'));
		fn.processChildren(_.defaults({meta: op}, args));
	};

	fnWSDL.input = function(args) {
		var input = u.setObj(args.meta, 'input');
		u.setAttrs(input, args.element, args.$$);
		fn.processChildren(_.defaults({meta: input}, args));
	};

	fnWSDL.output = function(args) {
		var output = u.setObj(args.meta, 'output');
		u.setAttrs(output, args.element, args.$$);
		fn.processChildren(_.defaults({meta: output}, args));
	};

	fnWSDL.fault = function(args) {
		var fault = u.setObj(u.setObj(args.meta, 'faults'), args.element.getAttribute('name'));
		u.setAttrs(fault, args.element, args.$$, ['name']);
		fn.processChildren(_.defaults({meta: fault}, args));
	};
	
	
	fnWSDL.binding = function(args) {
		var nn = u.setObj(u.setObj(u.setObj(args.root, 'bindings'), args.tns), args.element.getAttribute('name'));
		nn[args.$$('type')] = args.element.getAttribute('type');
		fn.processChildren(_.defaults({meta: nn}, args));
	};

	
	fnWSDL.documentation = function() {};
	
	/*
	 * XML Processors
	 */
	fnXML.complexType = function(args) {
		var name = args.element.getAttribute('name');
		if (name) {
			fn.processChildren(_.defaults({meta: u.setObj(args.meta, name)}, args));
		}
		else {
			fn.processChildren(args);
		}
		
	};
	fnXML.simpleType     = fnXML.complexType;
	fnXML.complexContent = fn.processChildren;
	fnXML.simpleContent  = fn.processChildren;
	fnXML.sequence       = fn.processChildren;
	
	fnXML.extension = function(args) {
		args.meta[args.$$('extension')] = args.element.getAttribute('base');
		fn.processChildren(args);
	};
	fnXML.restriction = function(args) {
		args.meta[args.$$('restriction')] = args.element.getAttribute('base');
		fn.processChildren(args);
	};
	
	fnXML.sequence = function(args) {
		args.meta[args.$$('sequence')] = true;
		fn.processChildren(args);
	};
	
	fnXML.enumeration = function(args) {
		var value = args.element.getAttribute('value');
		args.meta[args.$$('enumeration')] = true;
		args.meta[value] = value;
	};
	fnXML.import  = fnWSDL.import;
	fnXML.include = fnWSDL.include;
	
	fnXML.schema = function(args) {
		var tag   = args.element;
		var tns   = tag.getAttribute('targetNamespace') || args.tns || _.get(tag, '_nsMap.' + tag.prefix);
		var nsMap = args.nsMap || _.get(args.element, 'documentElement._nsMap') ||
					_.get(args.element, 'ownerDocument.documentElement._nsMap');
		var tt = u.setObj(u.setObj(args.root, 'types'), tns);
		_.merge(u.setObj(tt, args.$$('nsMap')), nsMap);
		u.setAttrs(tt, tag, args.$$);
		fn.processChildren(_.defaults({
			tns: tns,
			nsMap: nsMap,
			meta: tt
		}, args));
	};
	
	fnXML.element = function(args) {
		var obj  = u.setObj(args.meta, args.element.getAttribute('name'));
		u.setAttrs(obj, args.element, args.$$, ['name']);
		fn.processChildren(_.defaults({meta: obj}, args));
	};
	
	fnXML.attribute = fnXML.element;
	
	/*
	 * http processors
	 */
	fnHTTP.binding = function(args) {
		u.setObj(args.meta, args.$$('http')).verb = args.element.getAttribute('verb');
		fn.processChildren(args);
	};
	
	fnHTTP.urlEncoded = function(args) {
		args.meta[args.$$('urlEncoded')] = true;
	};
	
	fnHTTP.address = function(args) {
		var $$soap = u.setObj(args.meta, args.$$('soap'));
		$$soap.location = args.element.getAttribute('location');
		fn.processChildren(_.defaults({meta: $$soap}, args));
	};
	
	fnHTTP.operation = function(args) {
		u.setObj(args.meta, args.$$('http')).location = args.element.getAttribute('location');
	};
	
	/*
	 * mime processors
	 */
	fnMIME.mimeXml = function(args) {
		u.setObj(args.meta, args.$$('http')).mimeXml = true;
	};
	
	fnMIME.content = function(args) {
		u.setAttrs(u.setObj(args.meta, args.$$('http')), args.element, args.$$);
	};

	/*
	 * soap processors
	 */
	fnSOAP.address = function(args) {
		var $$soap = u.setObj(args.meta, args.$$('soap'));
		$$soap.location = args.element.getAttribute('location');
		fn.processChildren(_.defaults({meta: $$soap}, args));
	};
	
	fnSOAP12.address = fnSOAP.address;
	
	
	fn.binding = function(args) {
		var $$soap = u.setObj(args.meta, args.$$('soap'));
		_.forEach(args.element.attributes, function(attr) {
			if (u.attrName(attr) !== 'name') {
				$$soap[u.attrName(attr)] = u.attrValue(attr);
			}
		});
	};
	
	fnSOAP.binding = function(args) {
		args.meta[args.$$('nsMap')] = args.nsMap || _.get(args.element, 'documentElement._nsMap') ||
									_.get(args.element, 'ownerDocument.documentElement._nsMap');
		fn.binding(args);
	};
	
	
	fnSOAP12.binding   = fn.binding;
	fnSOAP12.operation = fn.binding;
	fnSOAP12.body      = fn.binding;
	fnSOAP.body        = fn.binding;
	fnSOAP.fault       = fn.binding;
	fnSOAP.operation   = fn.binding;
	
	

	
	// retrieve the metadata either from cache or by processing the wsdl
	function buildClient(mainWSDL, options) {
		var meta           = {};
		var emitter        = new env.events.EventEmitter();
		var cache          = new localStorage.LocalStorage('./.localStroage');
		var metadata       = cache.getItem(mainWSDL);
		
		// create a new promise that resolves the metadata and return it
		return new Promise(function(resolve, reject) {
			if (options.cache !== false && metadata) {
				return resolve(JSON.parse(metadata));
			}
			
			var loads = [];
			emitter.on('wsdl.load.error', function(err) {
				reject(err);
			});
			emitter.on('wsdl.load.start', function(lookup) {
				loads.push(lookup);
			});
			emitter.on('wsdl.load.complete', function(lookup) {
				var index = loads.indexOf(lookup);
				if (index >= 0) {
				  loads.splice( index, 1 );
				}
				if (loads.length === 0) {
					emitter.emit('wsdl.loaded');
				}
			});
			emitter.on('wsdl.loaded', function() {
				emitter.removeAllListeners();
				
				// move the operations into their correct service
				// and add the binding metadata
				_.forEach(meta.services, function(ns, nsName) {
					_.forEach(ns, function(svc, svcName) {
						if (!u.isMeta(svcName, options.metadataPrefix)) {
							_.forEach(svc, function(port, portName) {
								var bind     = u.nsplit(port[options.$$('binding')]);
								var tns      = ns[options.$$('nsMap')][bind.prefix];
								var binding  = meta.bindings[tns][bind.name];
								var portType = u.nsplit(binding[options.$$('type')]);
								var ptns     = _.get(binding[options.$$('nsMap')], portType.prefix);
								var pt       = _.get(_.get(meta, 'portTypes')[ptns], portType.name);
								_.merge(port, binding, pt);
							});
						}
					});
				});
				
				// rename the combined object to operations and remove
				// portType and binding from the response
				meta = _.omit(meta, ['portTypes', 'bindings']);
				cache.setItem(mainWSDL, JSON.stringify(meta));
				
				resolve(meta);
			});
			
			loadDocument({
				uri     : mainWSDL,
				options : options,
				emitter : emitter,
				root    : meta,
				meta    : meta,
				$$      : options.$$
				
			});
		});
	}
	
	// get a type override function
	function getTypeFn(val, def, wsdl, opt) {
		if (_.has(val, opt.$$('type'))) {
			var type = u.nsplit(val[opt.$$('type')]);
			return _.get(wsdl.types[type.prefix], type.name);
		}
		return def;
	}
	
	
	// build a specific type
	function createType(type, tns, wsdl, options) {
		var schema = _.get(wsdl._meta, 'types')[tns];
		var nsMap  = _.get(schema, options.$$('nsMap'));
		return function(obj, seen) {
			obj           = obj  || undefined;
			seen          = seen || [];
			var objSchema = _.get(schema, type);
			var skel      = {};
			var ext       = _.get(objSchema, options.$$('extension'));
			
			// check for a type reference
			if (_.has(objSchema, options.$$('type'))) {
				var ttName = _.get(objSchema, options.$$('type'));
				var tt     = u.nsplit(ttName);
				var ttFn   = _.get(wsdl.types[tt.prefix], tt.name);
				if (_.isFunction(ttFn)) {
					return ttFn(obj, _.clone(seen));
				}
				throw 'Unable to find type: ' + ttName;
			}
			
			// check for enums
			if (_.get(objSchema, options.$$('enumeration')) === true) {
				var enums = _.omitBy(objSchema, function(v, k) {
					return u.isMeta(k, options.metadataPrefix);
				});
				if (obj === undefined) {
					return enums;
				}
				else if (_.has(enums, obj)) {
					var enumRestriction = _.get(objSchema, options.$$('restriction'));
					if (enumRestriction) {
						var r = u.nsplit(enumRestriction);
						var rfn = _.get(wsdl.types, [r.prefix, r.name].join('.'));
						if (_.isFunction(rfn)) {
							return rfn(obj);
						}
					}
					return obj;
				}
				return undefined;
			}
			
			// get the inherited properties
			if (ext) {
				var i   = u.nsplit(ext);
				var ifn = _.get(wsdl.types[i.prefix], i.name);
				if (_.isFunction(ifn)) {
					skel = ifn(obj, _.clone(seen));
				}
			}

			// get each property
			_.forEach(objSchema, function(prop, propName) {
				if (!u.isMeta(propName, options.metadataPrefix)) {
					var useFn;
					var typeName  = _.get(prop, options.$$('type'));					
					var maxOccurs = _.get(prop, options.$$('maxOccurs'));
					var type      = u.nsplit(typeName);
					var typeFn    = _.get(wsdl.types[type.prefix], type.name);
					var cObj      = _.get(obj, propName) || undefined;
					maxOccurs     = !isNaN(maxOccurs) ? Number(maxOccurs) : (maxOccurs === 'unbounded') ? -1 : null;
					var isArray   = maxOccurs === -1 || maxOccurs > 1;

					if (_.includes(seen, typeName) && obj === undefined) {
						skel[propName] = isArray ? [typeName] : typeName;
					}
					else if (_.isFunction(typeFn)) {
						
						if (obj === undefined) {
							seen.push(typeName);
							skel[propName] = isArray ? [typeFn(undefined, _.clone(seen))] : typeFn(undefined, _.clone(seen));
						}
						else if (cObj !== undefined) {
							if (isArray) {
								if (Array.isArray(cObj)) {
									skel[propName] = [];
									_.forEach(cObj, function(c) {
										useFn = getTypeFn(c, typeFn, wsdl, options);
										skel[propName].push(useFn(c, _.clone(seen)));
									});
								}
							}
							else {
								useFn = getTypeFn(cObj, typeFn, wsdl, options);
								skel[propName] = typeFn(cObj, _.clone(seen));
							}
						}
					}
					else if (obj === undefined) {
						skel[propName] = isArray ? [typeName] : typeName;
					}
				}
			});
			return skel;
		};
	}
	
	function getMetaObj(wsdl, uri, nsMap, subkey) {
		var sub = _.get(wsdl, subkey);
		var obj = u.nsplit(uri);
		var ns  = _.get(nsMap, obj.prefix);
		return _.get(sub[ns], obj.name);
	}
	
	function createOperation11(name, port, wsdl, options) {
		var $$ = options.$$;
		return function(args) {
			var nsMap    = port[$$('nsMap')];
			var op       = port[name];		
			var inObj    = getMetaObj(wsdl, op.input[$$('message')], nsMap, '_meta.messages');
			var outObj   = getMetaObj(wsdl, op.output[$$('message')], nsMap, '_meta.messages');
			//var params   = getMetaObj(wsdl, inObj.parameters, nsMap, 'types')();
			//var params   = _.get(wsdl, inObj.parameters.replace(':', '.'))();
			//console.log(_.get(wsdl.types, inObj.parameters.replace(':', '.')));
			console.log(_.keys(wsdl.types));
			//console.log(params);
			
			/*
			var msgstr     = '';
			var op         = _.get(port, name);
			var ns         = _.get(port, 'operations.' + opt.$$ + 'namespace') || ns;
			var nsParts    = nsplit(ns);
			var serializer = new xmldom.XMLSerializer();
			var dom        = new xmldom.DOMImplementation();
			var doc        = dom.createDocument(ns);
			var encoding   = doc.createElement();
			var envelope   = doc.createElementNS(ns, 'soapenv:Envelope');
			var body       = doc.createElementNS(ns, 'soapenv:Body');
			var method     = doc.createElementNS(ns, [nsParts.prefix, name].join(':'));
			*/
		};
	}
	function createOperation12(name, port, wsdl, options) {
		
	}
	
	// determines the version of soap protocol to use
	function createOperation(name, port, wsdl, options) {
		if (_.get(port[options.$$('nsMap')], 'soap') === 'http://schemas.xmlsoap.org/wsdl/soap/') {
			return createOperation11(name, port, wsdl, options);
		}
		else if (_.get(port[options.$$('nsMap')], 'soap') === 'http://schemas.xmlsoap.org/wsdl/soap12/') {
			return createOperation12(name, port, wsdl, options);
		}
	}
	
	
	// build the types
	function buildTypes(wsdl, options) {
		var types = u.setObj(wsdl, 'types');
		_.forEach(_.get(wsdl._meta, 'types'), function(ns, nsName) {
			var nsPrefix = _.find(ns[options.$$('nsMap')], function(v, k) {
				return v === nsName;
			});

			// add the XML schema types
			_.forEach(_.get(ns, options.$$('nsMap')), function(n, nn) {
				if (n === 'http://www.w3.org/2001/XMLSchema') {
					types[nn] = w3(nn);
				}
			});
			
			// build the types
			_.forEach(ns, function(type, typeName) {
				if (!u.isMeta(typeName, options.metadataPrefix)) {
					var t = u.setObj(types, nsPrefix);
					t[typeName] = createType(typeName, nsName, wsdl, options);
				}
			});
		});
	}
	
	// build services and ports
	function buildServices(wsdl, options) {
		_.forEach(wsdl._meta.services, function(ns, nsName) {
			var n = u.setObj(wsdl, 'services');
			_.forEach(ns, function(svc, svcName) {
				if (!u.isMeta(svcName, options.metadataPrefix)) {
					var s = u.setObj(n, svcName);
					_.forEach(svc, function(port, portName) {
						var p = u.setObj(s, portName);
						_.forEach(port, function(op, opName) {
							if (!u.isMeta(opName, options.metadataPrefix)) {
								u.setObj(p, opName, createOperation(opName, port, wsdl, options));
							}
						});
					});	
				}
			});
		});
	}
	
	
	
	// main function to request and parse the wsdl
	return function(mainWSDL, options) {
		var wsdl               = {};
		options                = options || {};
		options.mainWSDL       = mainWSDL;
		options.metadataPrefix = options.metadataPrefix || '$$';
		options.$$             = u.metaify(options.metadataPrefix);
		
		return buildClient(mainWSDL, options).then(function(metadata) {
			wsdl._meta = metadata;
			buildTypes(wsdl, options);
			buildServices(wsdl, options);
			return wsdl;
		});
	};
};