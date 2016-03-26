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
	var fn           = {
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
		fn.processChildren(_.defaults({meta: pt}, args));
	};
	
	fnWSDL.operation = function(args) {
		var op = u.setObj(args.meta, args.element.getAttribute('name'));
		fn.processChildren(_.defaults({meta: op}, args));
	};

	fnWSDL.input = function(args) {
		var input = u.setObj(args.meta, 'input');
		u.setAttrs(input, args.element);
		fn.processChildren(_.defaults({meta: input}, args));
	};

	fnWSDL.output = function(args) {
		var output = u.setObj(args.meta, 'output');
		u.setAttrs(output, args.element);
		fn.processChildren(_.defaults({meta: output}, args));
	};

	fnWSDL.fault = function(args) {
		var fault = u.setObj(u.setObj(args.meta, 'faults'), args.element.getAttribute('name'));
		u.setAttrs(fault, args.element, ['name']);
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
		u.setAttrs(tt, tag);
		fn.processChildren(_.defaults({
			tns: tns,
			nsMap: nsMap,
			meta: tt
		}, args));
	};
	
	fnXML.element = function(args) {
		var obj  = u.setObj(args.meta, args.element.getAttribute('name'));
		u.setAttrs(obj, args.element, ['name']);
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
		u.setAttrs(u.setObj(args.meta, args.$$('http')), args.element);
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
	
	// main function to request and parse the wsdl
	return function(mainWSDL, options) {
		
		var wsdl               = {};
		options                = options || {};
		options.mainWSDL       = mainWSDL;
		options.metadataPrefix = options.metadataPrefix || '$$';
		options.$$             = u.metaify(options.metadataPrefix);
		
		return buildClient(mainWSDL, options).then(function(metadata) {
			wsdl._meta = metadata;
			return wsdl;
		});
	};
};