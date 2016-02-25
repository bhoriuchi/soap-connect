/**
 * SOAP Connect
 * 
 * @author Branden Horiuchi <bhoriuchi@gmail.com>
 * @license MIT
 * 
 */
module.exports = function(env) {
	
	var emitter = new env.events.EventEmitter();
	var xml     = env.xml;
	var _       = env.lodash;
	var request = env.request;
	var Promise = env.promise;
	var wsdl    = {
		services: {},
		namespaces: {}
	};
	var ns      = wsdl.namespaces;
	var imports = [];
	
	
	// get the services and ports
	function service(obj) {
		_.forEach(obj, function(svc) {
			if (!_.has(wsdl.services, svc.name)) {
				wsdl.services[svc.name] = { ports: {} };
				_.forEach(svc.port, function(p) {
					if (!_.has(wsdl.services[svc.name][p.name])) {
						wsdl.services[svc.name][p.name] = {
							binding: p.binding
						};
					}
				});
			}
		});
	}
	
	
	function processWSDL(obj) {
		if (!Array.isArray(obj) && _.isObject(obj)) {
			_.forEach(obj, function(v, k) {
				if (_.lower(k) === 'service') {
					service(v);
				}
			});
		}
	}
	
	function read(uri) {
		return new Promise(function(resolve, reject) {
			request(uri, function(error, response, body) {
				if (error) {
					reject(error);
				}
				resolve(body);
			});
		});
	}
	
	
	function getWSDL(uri, imported) {
		
		// if the file has not already been imported
		if (!_.includes(imported, uri)) {

			// add it to the imported list
			imported.push(uri);
			
			// read the file
			read(uri).then(function(data) {
				
				// parse the XML
				data = xml.toJson(data, {
					object: true,
					reversible: true,
					coerce: true,
					arrayNotation: true
				});
				
				console.log(JSON.stringify(data, null, '  '));
				console.log('--=-=-=-');
				
				// look through each definition for its namespace
				_.forEach(data.definitions, function(def) {
					
					// add the namespace if it doesnt exist
					if (def.targetNamespace) {
						ns[def.targetNamespace] = ns[def.targetNamespace] || {};
						
						if (_.has(def, 'xmlns:interface')) {
							
						}
						
					}

				});
				
				// check if there are any pending imports
				if (imports.length === 0) {
					emitter.emit('parse.end');
				}
				
			});
		}
	}
	
	
	function parse(uri, options) {
		
		// check for ignoreSSL
		if (options.ignoreSSL) {
			process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
		}
		
		// call the import function
		getWSDL(uri, []);
		
		// return a promise that resolves the wsdl object
		return new Promise(function(resolve, reject) {
			emitter.on('parse.end', function() {
				resolve(wsdl);
			});
			emitter.on('parse.error', function(err) {
				reject(err);
			});
		});
	}
	
	
	return {
		parse: parse
	};
	

};