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
		'http://schemas.xmlsoap.org/wsdl/': {},
		'http://schemas.xmlsoap.org/wsdl/soap/': {},
		'http://www.w3.org/2001/XMLSchema': {},
		'TAG': {},
		'': {}
	};
	var fnWSDL = fn['http://schemas.xmlsoap.org/wsdl/'];
	var fnSOAP = fn['http://schemas.xmlsoap.org/wsdl/soap/'];
	var fnXML  = fn['http://www.w3.org/2001/XMLSchema'];
	var fnTAG  = fn.TAG;
	
	
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
	 * type processors
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
	
	fnXML.complexType = function(args) {
		var name = args.element.getAttribute('name');
		if (name) {
			args.meta[name] = args.meta[name] || {};
			fn.processChildren(_.defaults({meta: args.meta[name]}, args));
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
	
	fnTAG.xml = function(args) {
		var data  = _.get(args.element, 'nodeValue') || _.get(args.element, 'data');
		args.root[args.options.$$('doctype')] = '<?xml ' + data + '?>';
	};

	fnWSDL.service = function(args) {
		var name = args.element.getAttribute('name');
		args.root.services = args.root.services || {};
		args.root.services[args.tns] = args.root.services[args.tns] || {};
		args.root.services[args.tns][args.$$('nsMap')] = args._nsMap;
		args.root.services[args.tns][name] = args.root.services[args.tns][name] || {};
		fn.processChildren(_.defaults({meta: args.root.services[args.tns][name]}, args));
	};
	
	fnWSDL.port = function(args) {
		var name = args.element.getAttribute('name');
		args.meta[name] = args.meta[name] || {};
		args.meta[name][args.$$('binding')] = args.element.getAttribute('binding');
		fn.processChildren(_.defaults({meta: args.meta[name]}, args));
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
	fnXML.import = fnWSDL.import;
	
	fnWSDL.include = function(args) {
		var tag   = args.element;
		var loc   = tag.getAttribute('location') || tag.getAttribute('schemaLocation');
		var uri   = u.getURI(loc, args.baseURI);
		loadDocument(_.defaults({uri: uri}, args));
	};
	fnXML.include = fnWSDL.include;
	
	fnWSDL.types = function(args) {
		args.root.types = args.root.types || {};
		fn.processChildren(_.defaults({meta: args.root.types}, args));
	};
	
	fnXML.schema = function(args) {
		var tag = args.element;
		var tns = tag.getAttribute('targetNamespace') || args.tns || _.get(tag, '_nsMap.' + tag.prefix);
		var nsMap = _.get(tag, '_nsMap');
		var types = args.root.types;
		
		types[tns] = types[tns] || {};
		var tt     = types[tns];
		_.forEach(tag.attributes, function(attr) {
			if (u.attrName(attr) !== 'name') {
				tt[args.$$(u.attrName(attr))] = u.attrValue(attr);
			}
		});
		fn.processChildren(_.defaults({
			tns: tns,
			nsMap: nsMap,
			meta: types[tns]
		}, args));
	};
	
	fnXML.element = function(args) {
		var tag = args.element;
		var name = tag.getAttribute('name');
		
		args.meta[name] = args.meta[name] || {};
		_.forEach(tag.attributes, function(attr) {
			if (u.attrName(attr) !== 'name') {
				args.meta[name][args.$$(u.attrName(attr))] = u.attrValue(attr);
			}
		});
		fn.processChildren(_.defaults({meta: args.meta[name]}, args));
	};
	fnXML.attribute = fnXML.element;
	
	fnWSDL.message1 = function(args) {
		var name = args.element.getAttribute('name');
		args.root.messages = args.root.messages || {};
		var msgs = args.root.messages;
		msgs[args.tns] = msgs[args.tns] || {};
		msgs[args.tns][name] = msgs[args.tns][name] || {};
		fn.processChildren(_.defaults({meta: msgs[args.tns][name]}, args));
	};
	
	fnWSDL.part = function(args) {
		var tag  = args.element;
		var name = tag.getAttribute('name');
		args.meta[name] = tag.getAttribute('type') || tag.getAttribute('element');
	};
	
	fnSOAP.address = function(args) {
		var $$soap = args.$$('soap');
		args.meta[$$soap] = args.meta[$$soap] || {};
		args.meta[$$soap].location = args.element.getAttribute('location');
		fn.processChildren(_.defaults({meta: args.meta[$$soap]}, args));
	};
	
	fnWSDL.portType = function(args) {
		var name = args.element.getAttribute('name');
		args.root.portTypes = args.root.portTypes || {};
		args.root.portTypes[args.tns] = args.root.portTypes[args.tns] || {};
		args.root.portTypes[args.tns][name] = args.root.portTypes[args.tns][name] || {};
		fn.processChildren(_.defaults({
			meta: args.root.portTypes[args.tns][name]
		}, args));
	};
	
	fnWSDL.operation = function(args) {
		var name = args.element.getAttribute('name');
		args.meta[name] = args.meta[name] || {};
		fn.processChildren(_.defaults({meta: args.meta[name]}, args));
	};
	
	fnWSDL.input = function(args) {
		args.meta.input = args.meta.input || {};
		_.forEach(args.element.attributes, function(attr) {
			if (u.attrName(attr) !== 'name') {
				args.meta.input[args.$$(u.attrName(attr))] = u.attrValue(attr);
			}
		});
	};

	fnWSDL.output = function(args) {
		args.meta.output = args.meta.output || {};
		_.forEach(args.element.attributes, function(attr) {
			if (u.attrName(attr) !== 'name') {
				args.meta.output[args.$$(u.attrName(attr))] = u.attrValue(attr);
			}
		});
	};

	fnWSDL.fault = function(args) {
		var name = args.element.getAttribute('name');
		args.meta.faults = args.meta.faults || {};
		args.meta.faults[name] = args.meta.faults[name] || {};
		_.forEach(args.element.attributes, function(attr) {
			if (u.attrName(attr) !== 'name') {
				args.meta.faults[name][args.$$(u.attrName(attr))] = u.attrValue(attr);
			}
		});
	};
	
	// retrieve the metadata either from cache or by processing the wsdl
	function buildClient(mainWSDL, options) {
		var meta           = {};
		var emitter        = new env.events.EventEmitter();
		var cache          = new localStorage.LocalStorage('./.localStroage');
		var metadata       = null;//cache.getItem(mainWSDL);
		
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
			//console.log(JSON.stringify(metadata, null, '  '));
			wsdl._meta = metadata;
			return wsdl;
		});
	};
	
};