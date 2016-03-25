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
		'': {}
	};
	var fnWSDL = fn['http://schemas.xmlsoap.org/wsdl/'];
	var fnSOAP = fn['http://schemas.xmlsoap.org/wsdl/soap/'];
	
	
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
				args.opt.baseURI = args.uri.substring(0, args.uri.lastIndexOf('/')) + '/';
				
				// check for errors
				if (err || response.statusCode !== 200) {
					return args.emitter.emit('wsdl.load.error', err || body || response);
				}
				
				// parse the document
				var doc = new xmldom.DOMParser().parseFromString(body);

				// if all is successful, add the URI to the loaded array
				args.loaded.push(args.uri);
				
				// process the document children
				_.merge(args.meta, fn.processChildren(doc, args.meta, null, args.opt, args.loaded, args.emitter));
				
				// return the metadata in the callback
				args.emitter.emit('wsdl.load.complete', args.uri);
			});
		}
	}
	
	
	
	/*
	 * type processors
	 */
	fn.processChildren = function(obj, meta, ns, opt, loaded, emitter) {
		var _meta = {};
		_.forEach(obj.childNodes, function(child) {
			var tag = u.getTag(child);
			var nsMap = _.get(obj, 'documentElement._nsMap') || _.get(obj, 'ownerDocument.documentElement._nsMap');
			var xmlns = _.get(nsMap, tag._prefix) || '';

			if (tag && _.isFunction(_.get(fn[xmlns], tag._name))) {
				_.merge(_meta, fn[xmlns][tag._name](tag, meta, ns, opt, loaded, emitter));
			}
			else if (tag && !_.includes(['#comment', '#text', 'message', 'element'], tag._name)) {
				console.log('no processor for ', [tag._prefix, tag._name].join(':'), u.cleanTag(tag));
			}
		});
		return _meta;
	};
	
	fnWSDL.xml = fn[''].xml = function(tag, meta, ns, opt, loaded, emitter) {
		var _meta = {};
		_meta[opt.$$('doctype')] = '<?xml ' + (_.get(tag, 'nodeValue') || _.get(tag, 'data')) + '?>';
		return _meta;
	};

	fnWSDL.service = function(tag, meta, ns, opt, loaded, emitter) {
		var _meta = { services: {} };
		var name  = tag.getAttribute('name');
		_meta.services[name] = {};
		_.merge(_meta.services[name], fn.processChildren(tag, meta, ns, opt, loaded, emitter));
		return _meta;
	};
	
	fnWSDL.port = function(tag, meta, ns, opt, loaded, emitter) {
		var _meta   = {};
		var name    = tag.getAttribute('name');
		_meta[name] = {};
		_meta[name][opt.$$('binding')] = tag.getAttribute('binding');
		_.merge(_meta[name], fn.processChildren(tag, meta, ns, opt, loaded, emitter));
		return _meta;
	};
	
	fnWSDL.definitions = function(tag, meta, ns, opt, loaded, emitter) {
		var tns   = tag.getAttribute('targetNamespace') || _.get(tag, '_nsMap.' + tag.prefix) || _.get(tag, '_nsMap')[''];
		meta[tns] = meta[tns] || {};
		meta[tns][opt.$$('nsMap')] = _.get(tag, '_nsMap');
		_.merge(meta[tns], fn.processChildren(tag, meta, tns, opt, loaded, emitter));
		return meta;
	};
	
	fnWSDL.import = function(tag, meta, ns, opt, loaded, emitter) {
		var nsamespace    = tag.getAttribute('namespace');
		var loc   = tag.getAttribute('location') || tag.getAttribute('schemaLocation');
		var uri   = u.getURI(loc, opt.baseURI);
		loadDocument({
			uri: uri,
			opt: _.cloneDeep(opt),
			meta: meta,
			loaded: loaded,
			emitter: emitter
		});
		return {};
	};
	
	fnWSDL.types = function(tag, meta, ns, opt, loaded, emitter) {
		var _meta   = { types: {} };
		_.merge(_meta.types, fn.processChildren(tag, meta, ns, opt, loaded, emitter));
		return _meta;
	};
	
	fnWSDL.schema = function(tag, meta, ns, opt, loaded, emitter) {
		var _meta = {};
		_meta.types = fn.processChildren(tag, meta, ns, opt, loaded, emitter);
		return _meta;
	};
	
	fnSOAP.address = function(tag, meta, ns, opt, loaded, emitter) {
		var _meta = {};
		_meta[opt.$$('soap')] = {};
		_meta[opt.$$('soap')].location = tag.getAttribute('location');
		_.merge(_meta[opt.$$('soap')], fn.processChildren(tag, meta, ns, opt, loaded, emitter));
		return _meta;
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
				uri: mainWSDL,
				opt: options,
				emitter: emitter,
				meta: meta
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
			console.log(JSON.stringify(metadata, null, '  '));
			wsdl._meta = metadata;
			return wsdl;
		});
	};
	
};