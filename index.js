'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var _ = _interopDefault(require('lodash'));
var url = _interopDefault(require('url'));
var EventEmitter = _interopDefault(require('events'));
var path = _interopDefault(require('path'));
var LocalStorage = _interopDefault(require('node-localstorage'));
var xmldom = _interopDefault(require('xmldom'));
var request = _interopDefault(require('request'));
var xmlbuilder = _interopDefault(require('xmlbuilder'));

var SOAP = {
  'http://schemas.xmlsoap.org/wsdl/soap/': {
    version: '1.1',
    ns: 'http://schemas.xmlsoap.org/wsdl/soap/',
    envelope: 'http://schemas.xmlsoap.org/soap/envelope/',
    encoding: 'http://schemas.xmlsoap.org/soap/encoding/',
    contentType: 'text/xml'
  },
  'http://schemas.xmlsoap.org/wsdl/soap12/': {
    version: '1.2',
    ns: 'http://schemas.xmlsoap.org/wsdl/soap12/',
    encoding: 'http://www.w3.org/2003/05/soap-encoding/',
    envelope: 'http://www.w3.org/2003/05/soap-envelope',
    contentType: 'application/soap+xml'
  }
};

var XS_NS = 'http://www.w3.org/2001/XMLSchema';
var XSI_NS = 'http://www.w3.org/2001/XMLSchema-instance';
var WSDL_NS = 'http://schemas.xmlsoap.org/wsdl/';

var XS_PREFIX = 'xsd';
var XSI_PREFIX = 'xsi';
var SOAPENV_PREFIX = 'soapenv';
var SOAPENC_PREFIX = 'soapenc';
var NODE_TYPES = {
  ELEMENT_NODE: 1,
  ATTRIBUTE_NODE: 2,
  TEXT_NODE: 3,
  CDATA_SECTION_NODE: 4,
  ENTITY_REFERENCE_NODE: 5,
  ENTITY_NODE: 6,
  PROCESSING_INSTRUCTION_NODE: 7,
  COMMENT_NODE: 8,
  DOCUMENT_NODE: 9,
  DOCUMENT_TYPE_NODE: 10,
  DOCUMENT_FRAGMENT_NODE: 11,
  NOTATION_NODE: 12
};

function loadDoc(uri, cache) {
  var _this = this;

  if (!_.has(cache, uri)) {
    (function () {
      cache[uri] = {};
      var baseURI = uri.substring(0, uri.lastIndexOf('/')) + '/';
      _this.emit('wsdl.load.start', uri);

      request(uri, function (err, res, body) {
        if (err || res.statusCode !== 200) return _this.emit('wsdl.load.error', err || body || res);
        var doc = cache[uri] = new xmldom.DOMParser().parseFromString(body);
        var wsdlImports = doc.getElementsByTagNameNS(WSDL_NS, 'import');
        var xsImports = doc.getElementsByTagNameNS(XS_NS, 'import');
        var xsIncludes = doc.getElementsByTagNameNS(XS_NS, 'include');
        _.forEach(_.union(wsdlImports, xsImports, xsIncludes), function (link) {
          var loc = link.getAttribute('location') || link.getAttribute('schemaLocation');
          _this.loadDoc(url.parse(loc).host ? loc : url.resolve(baseURI, loc), cache);
        });

        _this.emit('wsdl.load.end', uri);
      });
    })();
  }
}

var any = function any(obj) {
  return obj;
};

var xsd1_0 = {
  anyType: { convert: any },
  anySimpleType: { convert: any },
  duration: { convert: String },
  dateTime: { convert: String },
  time: { convert: String },
  date: { convert: String },
  gYearMonth: { convert: String },
  gYear: { convert: String },
  gMonthDay: { convert: String },
  gDay: { convert: String },
  gMonth: { convert: String },
  boolean: { convert: Boolean },
  base64Binary: { convert: String },
  hexBinary: { convert: String },
  float: { convert: Number },
  double: { convert: Number },
  anyURI: { convert: String },
  QName: { convert: String },
  NOTATION: { convert: String },
  string: { convert: String },
  decimal: { convert: Number },
  normalizedString: { convert: String },
  integer: { convert: Number },
  token: { convert: String },
  nonPositiveInteger: { convert: Number },
  long: { convert: Number },
  nonNegativeInteger: { convert: Number },
  language: { convert: String },
  Name: { convert: String },
  NMTOKEN: { convert: String },
  negativeInteger: { convert: Number },
  int: { convert: Number },
  unsignedLong: { convert: Number },
  positiveInteger: { convert: Number },
  NCName: { convert: String },
  NMTOKENS: { convert: String },
  short: { convert: Number },
  unsignedInt: { convert: Number },
  ID: { convert: String },
  IDREF: { convert: String },
  ENTITY: { convert: String },
  byte: { convert: String },
  unsignedShort: { convert: Number },
  IDREFS: { convert: String },
  ENTITIES: { convert: String },
  unsignedByte: { convert: String }
};

var NAMESPACES = {
  'http://www.w3.org/2001/XMLSchema': xsd1_0
};

function getBuiltinNSMeta() {
  return _.map(NAMESPACES, function (ns, name) {
    return {
      name: name,
      operations: [],
      services: [],
      types: _.keys(ns)
    };
  });
}

var asyncGenerator = function () {
  function AwaitValue(value) {
    this.value = value;
  }

  function AsyncGenerator(gen) {
    var front, back;

    function send(key, arg) {
      return new Promise(function (resolve, reject) {
        var request = {
          key: key,
          arg: arg,
          resolve: resolve,
          reject: reject,
          next: null
        };

        if (back) {
          back = back.next = request;
        } else {
          front = back = request;
          resume(key, arg);
        }
      });
    }

    function resume(key, arg) {
      try {
        var result = gen[key](arg);
        var value = result.value;

        if (value instanceof AwaitValue) {
          Promise.resolve(value.value).then(function (arg) {
            resume("next", arg);
          }, function (arg) {
            resume("throw", arg);
          });
        } else {
          settle(result.done ? "return" : "normal", result.value);
        }
      } catch (err) {
        settle("throw", err);
      }
    }

    function settle(type, value) {
      switch (type) {
        case "return":
          front.resolve({
            value: value,
            done: true
          });
          break;

        case "throw":
          front.reject(value);
          break;

        default:
          front.resolve({
            value: value,
            done: false
          });
          break;
      }

      front = front.next;

      if (front) {
        resume(front.key, front.arg);
      } else {
        back = null;
      }
    }

    this._invoke = send;

    if (typeof gen.return !== "function") {
      this.return = undefined;
    }
  }

  if (typeof Symbol === "function" && Symbol.asyncIterator) {
    AsyncGenerator.prototype[Symbol.asyncIterator] = function () {
      return this;
    };
  }

  AsyncGenerator.prototype.next = function (arg) {
    return this._invoke("next", arg);
  };

  AsyncGenerator.prototype.throw = function (arg) {
    return this._invoke("throw", arg);
  };

  AsyncGenerator.prototype.return = function (arg) {
    return this._invoke("return", arg);
  };

  return {
    wrap: function (fn) {
      return function () {
        return new AsyncGenerator(fn.apply(this, arguments));
      };
    },
    await: function (value) {
      return new AwaitValue(value);
    }
  };
}();

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

var defineProperty = function (obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
};

var inherits = function (subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
};

var possibleConstructorReturn = function (self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
};

var slicedToArray = function () {
  function sliceIterator(arr, i) {
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;

    try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"]) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  return function (arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if (Symbol.iterator in Object(arr)) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
  };
}();

var ELEMENT_NODE = NODE_TYPES.ELEMENT_NODE;


function getQName(qname) {
  var _ref, _ref2;

  var pfx = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';

  var _qname$split = qname.split(':'),
      _qname$split2 = slicedToArray(_qname$split, 2),
      prefix = _qname$split2[0],
      localName = _qname$split2[1];

  if (localName) return _ref = {}, defineProperty(_ref, pfx + 'prefix', prefix), defineProperty(_ref, pfx + 'localName', localName), _ref;
  return _ref2 = {}, defineProperty(_ref2, pfx + 'prefix', ''), defineProperty(_ref2, pfx + 'localName', prefix), _ref2;
}

function firstNode(nodes) {
  return _.get(nodes, '0');
}

function filterEmpty(obj) {
  return _.omitBy(obj, function (val) {
    if (_.isArray(val) && !val.length) return true;
    if (!val && val !== false) return true;
  });
}

function getOperationElement(data, node) {
  var _getQName = getQName(node.getAttribute('message'), 'm_'),
      m_prefix = _getQName.m_prefix,
      m_localName = _getQName.m_localName;

  var msgNS = node.lookupNamespaceURI(m_prefix);
  var msg = _.get(data, '["' + msgNS + '"].messages["' + m_localName + '"]');
  var part = _.first(msg.getElementsByTagNameNS(WSDL_NS, 'part'));

  var _getQName2 = getQName(part.getAttribute('element'), 'e_'),
      e_prefix = _getQName2.e_prefix,
      e_localName = _getQName2.e_localName;

  var elNS = node.lookupNamespaceURI(e_prefix);
  var el = _.get(data, '["' + elNS + '"].elements["' + e_localName + '"]');
  return el;
}

function parseRef(namespaces, node, ref) {
  var _getQName3 = getQName(ref),
      prefix = _getQName3.prefix,
      localName = _getQName3.localName;

  var name = localName;
  var namespace = prefix ? node.lookupNamespaceURI(prefix) : node.namespaceURI || XS_NS;
  var nsIdx = _.findIndex(namespaces, { name: namespace });
  var typeIdx = namespaces[nsIdx].types.indexOf(localName);

  // if not found, look through other namespaces
  if (typeIdx === -1) {
    _.forEach(namespaces, function (n, idx) {
      typeIdx = n.types.indexOf(localName);
      if (typeIdx !== -1) {
        nsIdx = idx;
        return false;
      }
    });
  }
  return [nsIdx, typeIdx];
}

function toProperty(namespaces, node, data) {
  var obj = {};
  _.forEach(node.attributes, function (attr) {
    var name = attr.name;
    var value = attr.value;
    if (name === 'ref') {
      var _getQName4 = getQName(value),
          prefix = _getQName4.prefix,
          localName = _getQName4.localName;

      var elNSURI = node.lookupNamespaceURI(prefix);
      var ref = _.get(data, '["' + elNSURI + '"].elements["' + localName + '"]');
      if (ref) {
        obj.name = ref.getAttribute('name');
        obj.type = parseRef(namespaces, ref, ref.getAttribute('type'));
      }
    } else if (name === 'type') {
      obj.type = parseRef(namespaces, node, value);
    } else {
      obj[name] = value;
    }
  });
  return obj;
}

function getNodeData(node) {
  return _.get(node, 'firstChild.data') || _.get(node, 'firstChild.nodeValue');
}

function getEndpointFromPort(client, port) {
  var svcURL = url.parse(port.address);
  if (svcURL.host.match(/localhost/i)) svcURL.host = client.options.endpoint;
  return url.format(svcURL);
}

function getFirstChildElement(node) {
  for (var key in node.childNodes) {
    var n = node.childNodes[key];
    if (n.nodeType === ELEMENT_NODE) {
      return n;
    }
  }
}

function getTypes(data, namespaces, types) {
  return _.map(types, function (type) {
    var attributes = [],
        elements = [],
        maxOccurs = null,
        minOccurs = null;
    var base = undefined,
        enumerations = [],
        unions = [];


    _.forEach(type.childNodes, function (node) {
      switch (node.localName) {
        case 'sequence':
        case 'choice':
        case 'all':
          maxOccurs = node.getAttribute('maxOccurs') || maxOccurs;
          minOccurs = node.getAttribute('minOccurs') || minOccurs;
      }
    });

    // process XSD elements
    _.forEach(type.getElementsByTagNameNS(XS_NS, 'element'), function (node) {
      var el = toProperty(namespaces, node, data);
      if (node.parentNode.localName === 'choice') {
        el.minOccurs = '0';
        maxOccurs = node.parentNode.getAttribute('maxOccurs') || maxOccurs;
      }
      elements.push(el);
    });

    // process XSD anys
    _.forEach(type.getElementsByTagNameNS(XS_NS, 'any'), function (node) {
      elements.push(toProperty(namespaces, node, data));
    });

    // process attributes
    _.forEach(type.getElementsByTagNameNS(XS_NS, 'attribute'), function (node) {
      attributes.push(toProperty(namespaces, node, data));
    });

    // process anyAttributes
    _.forEach(type.getElementsByTagNameNS(XS_NS, 'anyAttribute'), function (node) {
      attributes.push(toProperty(namespaces, node, data));
    });

    // process attributeGroup
    _.forEach(type.getElementsByTagNameNS(XS_NS, 'attributeGroup'), function (node) {
      var _getQName = getQName(node.getAttribute('ref')),
          prefix = _getQName.prefix,
          localName = _getQName.localName;

      var groupNSURI = node.lookupNamespaceURI(prefix);
      var attrGroup = _.get(data, '["' + groupNSURI + '"].attributeGroups', localName);
      _.forEach(attrGroup.getElementsByTagNameNS(XS_NS, 'attribute'), function (node) {
        attributes.push(toProperty(namespaces, node, data));
      });
      _.forEach(attrGroup.getElementsByTagNameNS(XS_NS, 'anyAttribute'), function (node) {
        attributes.push(toProperty(namespaces, node, data));
      });
    });

    // process extension
    var extension = _.get(type.getElementsByTagNameNS(XS_NS, 'extension'), '[0]', {});
    if (_.isFunction(extension.getAttribute)) {
      base = parseRef(namespaces, extension, extension.getAttribute('base'));
    }

    // process enums
    if (type.localName === 'simpleType') {
      _.forEach(type.getElementsByTagNameNS(XS_NS, 'restriction'), function (node) {
        _.forEach(node.getElementsByTagNameNS(XS_NS, 'enumeration'), function (e) {
          enumerations.push(e.getAttribute('value'));
        });
      });
      _.forEach(type.getElementsByTagNameNS(XS_NS, 'union'), function (node) {
        _.forEach(type.getElementsByTagNameNS(XS_NS, 'memberTypes').split(/\s+/g), function (t) {
          unions.push(parseRef(namespaces, node, t));
        });
      });
    }
    return filterEmpty({ attributes: attributes, base: base, elements: elements, enumerations: enumerations, maxOccurs: maxOccurs, minOccurs: minOccurs, unions: unions });
  });
}

function getPortOperations(data, namespace, port) {
  var _getQName2 = getQName(port.getAttribute('binding')),
      prefix = _getQName2.prefix;

  var bindingNS = prefix ? port.lookupNamespaceURI(prefix) : namespace;
  var binding = _.get(data, '["' + bindingNS + '"].binding');
  if (!binding) return [];
  return _.map(binding.getElementsByTagNameNS(binding.namespaceURI, 'operation'), function (op) {
    return op.getAttribute('name');
  });
}

function getPorts(data, namespace, def) {
  return _.map(def.ports, function (port, name) {
    return {
      name: name,
      address: port.$address,
      soapVersion: port.$soapVersion,
      service: port.parentNode.getAttribute('name'),
      operations: getPortOperations(data, namespace, port)
    };
  });
}

function processDef(data) {
  var operations = [],
      services = [],
      types = [];

  var namespaces = getBuiltinNSMeta();

  // add empty array objects for each builtin type
  // to keep indexes in sync
  _.forEach(namespaces, function (ns) {
    ns.isBuiltIn = true;
    operations.push([]);
    services.push([]);
    types.push([]);
  });

  // get types and operations by namespace
  _.forEach(data, function (def, name) {
    namespaces.push({
      name: name,
      prefix: def.$prefix,
      ports: getPorts(data, name, def),
      services: [],
      types: _.keys(def.types)
    });
  });

  // add types
  _.forEach(data, function (def) {
    return types.push(getTypes(data, namespaces, def.types));
  });

  // add operations
  _.forEach(data, function (def) {
    var ops = [];
    if (_.keys(def.ports).length) {
      _.forEach(def.ports, function (port) {
        var pOps = [];

        var _getQName3 = getQName(port.getAttribute('binding')),
            prefix = _getQName3.prefix;

        var portNS = port.lookupNamespaceURI(prefix);
        var binding = _.get(data, '["' + portNS + '"].binding');
        var portOps = _.map(binding.getElementsByTagNameNS(binding.namespaceURI, 'operation'), function (op) {
          return op.getAttribute('name');
        });
        _.forEach(portOps, function (name) {
          var node = _.get(data, '["' + portNS + '"].operations["' + name + '"]');
          var input = getOperationElement(data, _.first(node.getElementsByTagNameNS(WSDL_NS, 'input')));
          var output = getOperationElement(data, _.first(node.getElementsByTagNameNS(WSDL_NS, 'output')));
          pOps.push([{
            action: _.get(data, '["' + portNS + '"].actions["' + name + '"]').getAttribute('soapAction'),
            name: input.getAttribute('name'),
            type: parseRef(namespaces, input, input.getAttribute('type'))
          }, {
            type: parseRef(namespaces, output, output.getAttribute('type'))
          }]);
        });
        ops.push(pOps);
      });
    }
    operations.push(ops);
  });
  return { namespaces: namespaces, operations: operations, services: services, types: types };
}

// set operations via interface or portType
function setOperations(operations, portType) {
  _.forEach(portType.childNodes, function (node) {
    if (node.localName === 'operation') operations[node.getAttribute('name')] = node;
  });
}

function processDoc(doc, data) {
  /*
   * PROCESS DEFINITIONS
   */
  var definitions = doc.getElementsByTagNameNS(WSDL_NS, 'definitions');
  _.forEach(definitions, function (node) {
    var ns = node.getAttribute('targetNamespace');
    var nsData = data[ns] = data[ns] || {};
    nsData.$prefix = _.findKey(node._nsMap, function (o) {
      return o === ns;
    });
    nsData.actions = nsData.actions || {};
    nsData.messages = nsData.messages || {};
    nsData.operations = nsData.operations || {};
    nsData.ports = nsData.ports || {};

    _.forEach(node.childNodes, function (node) {
      switch (node.localName) {
        case 'binding':
          nsData.binding = node;
          _.forEach(node.childNodes, function (node) {
            if (node.localName === 'operation') {
              (function () {
                var op = node.getAttribute('name');
                _.forEach(node.childNodes, function (node) {
                  if (node.localName === 'operation') nsData.actions[op] = node;
                });
              })();
            }
          });
          break;
        case 'message':
          nsData.messages[node.getAttribute('name')] = node;
          break;
        case 'portType':
          setOperations(nsData.operations, node);
          break;
        case 'interface':
          setOperations(nsData.operations, node);
          break;
        case 'service':
          _.forEach(node.childNodes, function (node) {
            if (node.localName === 'port') {
              nsData.ports[node.getAttribute('name')] = node;
              _.forEach(node.childNodes, function (child) {
                if (child.localName === 'address') {
                  var _getQName = getQName(child.tagName || child.nodeName),
                      prefix = _getQName.prefix;

                  var soapNS = child.lookupNamespaceURI(prefix);
                  if (_.includes(_.keys(SOAP), soapNS)) {
                    node.$address = child.getAttribute('location');
                    node.$soapVersion = _.get(SOAP, '["' + soapNS + '"].version', '1.1');
                  }
                }
              });
            }
          });
          break;
      }
    });
  });

  /*
   * PROCESS SCHEMAS
   */
  var schemas = doc.getElementsByTagNameNS(XS_NS, 'schema');
  _.forEach(schemas, function (node) {
    var ns = node.getAttribute('targetNamespace');
    var nsData = data[ns] = data[ns] || {};
    nsData.attributes = nsData.attributes || {};
    nsData.types = nsData.types || {};
    nsData.elements = nsData.elements || {};
    nsData.attributeGroups = nsData.attributeGroups || {};

    _.forEach(node.childNodes, function (node) {
      (function () {
        switch (node.localName) {
          case 'attribute':
            nsData.attributes[node.getAttribute('name')] = node;
            break;
          case 'complexType':
          case 'simpleType':
            nsData.types[node.getAttribute('name')] = node;
            break;
          case 'element':
            var name = node.getAttribute('name');
            var el = nsData.elements[name] = node;
            _.forEach(node.childNodes, function (node) {
              if (_.includes(['complexType', 'simpleType'], node.localName)) {
                node.setAttribute('name', name);
                el.setAttribute('type', node.lookupPrefix(ns) + ':' + name);
                nsData.types[name] = node;
              }
            });
            break;
          case 'attributeGroup':
            nsData.attributeGroups[node.getAttribute('name')] = node;
            break;
        }
      })();
    });
  });
}

function processDocs(cache, data) {
  _.forEach(cache, function (doc) {
    return processDoc(doc, data);
  });
}

var methods = {
  loadDoc: loadDoc,
  processDef: processDef,
  processDocs: processDocs
};

/*
 * Strategy adapted from vSphere JS SDK  - https://labs.vmware.com/flings/vsphere-sdk-for-javascript#summary
 */

var BASE_DIR = __dirname.replace(/^(.*\/soap-connect)(.*)$/, '$1');
var STORAGE_PATH = path.resolve(BASE_DIR + '/.localStorage');

var WSDL = function (_EventEmitter) {
  inherits(WSDL, _EventEmitter);

  function WSDL(address) {
    var _ret;

    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    classCallCheck(this, WSDL);

    var _this = possibleConstructorReturn(this, (WSDL.__proto__ || Object.getPrototypeOf(WSDL)).call(this));

    _this.address = address;
    _this.options = options;
    var data = {};

    _.forEach(methods, function (method, name) {
      return _this[name] = method.bind(_this);
    });

    return _ret = new Promise(function (resolve, reject) {
      var resolving = [],
          store = null,
          cache = {};

      var useCache = _.get(_this.options, 'cache', true);

      if (useCache) {
        store = new LocalStorage.LocalStorage(STORAGE_PATH);
        var rawMetadata = store.getItem(_this.address);
        if (rawMetadata) {
          var metadata = JSON.parse(rawMetadata);
          _this.metadata = metadata;
          return resolve(_this);
        }
      }

      _this.on('wsdl.load.error', function (err) {
        return reject(err);
      });
      _this.on('wsdl.load.start', function (doc) {
        return resolving.push(doc);
      });
      _this.on('wsdl.load.end', function (doc) {
        var idx = resolving.indexOf(doc);
        if (idx >= 0) resolving.splice(idx, 1);
        if (!resolving.length) {
          _this.removeAllListeners();

          // process wsdl
          _this.processDocs(cache, data);
          _this.metadata = _this.processDef(data);

          // store the metadata
          if (useCache && store) store.setItem(_this.address, JSON.stringify(_this.metadata));

          // resolve the WSDL object
          return resolve(_this);
        }
      });
      _this.loadDoc(_this.address, cache);
    }), possibleConstructorReturn(_this, _ret);
  }

  createClass(WSDL, [{
    key: 'getType',
    value: function getType(t) {
      var _t = slicedToArray(t, 2),
          ns = _t[0],
          type = _t[1];

      return _.get(this.metadata, 'types[' + ns + '][' + type + ']');
    }
  }, {
    key: 'getTypeByLocalNS',
    value: function getTypeByLocalNS(nsURI, localName) {
      var nsIdx = _.findIndex(this.metadata.namespaces, { name: nsURI });
      var ns = _.get(this.metadata.namespaces, '[' + nsIdx + ']');
      var typeIdx = ns.types.indexOf(localName);
      return [nsIdx, typeIdx];
    }
  }, {
    key: 'getTypeAttribute',
    value: function getTypeAttribute(node) {
      for (var key in node.attributes) {
        var n = node.attributes[key];
        if (n.localName === 'type') {
          return n;
        }
      }
    }
  }, {
    key: 'getOp',
    value: function getOp(o) {
      var _o = slicedToArray(o, 3),
          ns = _o[0],
          port = _o[1],
          op = _o[2];

      return _.get(this.metadata, 'operations[' + ns + '][' + port + '][' + op + ']');
    }
  }, {
    key: 'getTypeName',
    value: function getTypeName(t) {
      var _t2 = slicedToArray(t, 2),
          ns = _t2[0],
          type = _t2[1];

      return _.get(this.metadata, 'namespaces[' + ns + '].types[' + type + ']');
    }
  }, {
    key: 'getTypeRoot',
    value: function getTypeRoot(t) {
      var root = this.getType(t).base;
      return root ? this.getTypeRoot(root) : t;
    }
  }, {
    key: 'getNSPrefix',
    value: function getNSPrefix(t) {
      var _t3 = slicedToArray(t, 1),
          ns = _t3[0];

      return _.get(this.metadata, 'namespaces[' + ns + '].prefix');
    }
  }, {
    key: 'getNSURIByPrefix',
    value: function getNSURIByPrefix(prefix) {
      return _.get(_.find(this.metadata.namespaces, { prefix: prefix }), 'name');
    }
  }, {
    key: 'isBuiltInType',
    value: function isBuiltInType(t) {
      var _t4 = slicedToArray(t, 1),
          ns = _t4[0];

      return _.get(this.metadata, 'namespaces[' + ns + '].isBuiltIn') === true;
    }
  }, {
    key: 'isEnumType',
    value: function isEnumType(t) {
      return _.has(this.getType(t), 'enumerations');
    }
  }, {
    key: 'isSimpleType',
    value: function isSimpleType(t) {
      return this.isBuiltInType(t) || this.isEnumType(t);
    }
  }, {
    key: 'isMany',
    value: function isMany(typeDef) {
      if (!typeDef.maxOccurs) return false;
      var maxOccurs = typeDef.maxOccurs === 'unbounded' ? 2 : Number(maxOccurs);
      return maxOccurs > 1;
    }
  }, {
    key: 'isRequired',
    value: function isRequired(typeDef) {
      return Number(typeDef.minOccurs) > 0;
    }
  }, {
    key: 'convertValue',
    value: function convertValue(type, value) {
      if (this.isEnumType(type)) return value;
      var t = this.getType(type);
      return t.convert ? t.convert(value) : value;
    }
  }]);
  return WSDL;
}(EventEmitter);

function WSDL$1 (address) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  return new WSDL(address, options);
}

// Strategy taken from node-soap/strong-soap

var Security$1 = function () {
  function Security() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    classCallCheck(this, Security);

    this.options = options;
  }

  createClass(Security, [{
    key: 'addOptions',
    value: function addOptions(options) {
      _.merge(this.options, options);
    }
  }, {
    key: 'addHttpHeaders',
    value: function addHttpHeaders(headers) {}
  }, {
    key: 'addSoapHeaders',
    value: function addSoapHeaders(headerElement) {}
  }, {
    key: 'postProcess',
    value: function postProcess(envelopeElement, headerElement, bodyElement) {}
  }]);
  return Security;
}();

var BasicSecurity = function (_Security) {
  inherits(BasicSecurity, _Security);

  function BasicSecurity(username, password, options) {
    classCallCheck(this, BasicSecurity);

    var _this = possibleConstructorReturn(this, (BasicSecurity.__proto__ || Object.getPrototypeOf(BasicSecurity)).call(this, options));

    _this.credential = new Buffer(username + ':' + password).toString('base64');
    return _this;
  }

  createClass(BasicSecurity, [{
    key: 'addHttpHeaders',
    value: function addHttpHeaders(headers) {
      headers.Authorization = 'Basic ' + this.credential;
    }
  }]);
  return BasicSecurity;
}(Security$1);

function BasicSecurity$1 (username, password, options) {
  return new BasicSecurity(username, password, options);
}

var BearerSecurity = function (_Security) {
  inherits(BearerSecurity, _Security);

  function BearerSecurity(token, options) {
    classCallCheck(this, BearerSecurity);

    var _this = possibleConstructorReturn(this, (BearerSecurity.__proto__ || Object.getPrototypeOf(BearerSecurity)).call(this, options));

    _this.token = token;
    return _this;
  }

  createClass(BearerSecurity, [{
    key: 'addHttpHeaders',
    value: function addHttpHeaders(headers) {
      headers.Authorization = 'Bearer ' + this.token;
    }
  }]);
  return BearerSecurity;
}(Security$1);

function BearerSecurity$1 (token, options) {
  return new BearerSecurity(token, options);
}

var CookieSecurity = function (_Security) {
  inherits(CookieSecurity, _Security);

  function CookieSecurity(cookie, options) {
    classCallCheck(this, CookieSecurity);

    var _this = possibleConstructorReturn(this, (CookieSecurity.__proto__ || Object.getPrototypeOf(CookieSecurity)).call(this, options));

    cookie = _.get(cookie, 'set-cookie', cookie);
    var cookies = _.map(_.isArray(cookie) ? cookie : [cookie], function (c) {
      return c.split(';')[0];
    });

    _this.cookie = cookies.join('; ');
    return _this;
  }

  createClass(CookieSecurity, [{
    key: 'addHttpHeaders',
    value: function addHttpHeaders(headers) {
      headers.Cookie = this.cookie;
    }
  }]);
  return CookieSecurity;
}(Security$1);

function CookieSecurity$1 (cookie, options) {
  return new CookieSecurity(cookie, options);
}

var Security = {
  Security: Security$1,
  BasicSecurity: BasicSecurity$1,
  BearerSecurity: BearerSecurity$1,
  CookieSecurity: CookieSecurity$1
};

function createTypes(wsdl) {
  var nsCount = 1,
      types = {};

  // add convert functions to builtins

  var nsIdx = 0;
  _.forEach(NAMESPACES, function (ns) {
    var typeIdx = 0;
    _.forEach(ns, function (type) {
      wsdl.metadata.types[nsIdx][typeIdx] = _.cloneDeep(type);
      typeIdx++;
    });
    nsIdx++;
  });

  // add extendedBy to keep track of inheritance
  _.forEach(wsdl.metadata.types, function (namespace, nsIdx) {
    _.forEach(namespace, function (type, typeIdx) {
      if (type.base) {
        var t = wsdl.getType(type.base);
        if (t) {
          t.extendedBy = t.extendedBy || [];
          t.extendedBy.push([nsIdx, typeIdx]);
        }
      }
    });
  });

  _.forEach(wsdl.metadata.namespaces, function (namespace, nsIdx) {
    var prefix = 'ns' + nsCount;
    if (namespace.prefix) {
      prefix = namespace.prefix;
    } else if (namespace.name === XS_NS) {
      wsdl.metadata.namespaces[nsIdx].prefix = XS_PREFIX;
      prefix = XS_PREFIX;
    } else {
      wsdl.metadata.namespaces[nsIdx].prefix = prefix;
      nsCount++;
    }
    _.forEach(namespace.types, function (typeName, typeIdx) {
      _.set(types, '["' + prefix + '"]["' + typeName + '"]', function (data) {});
    });
  });
  return types;
}

function getExtProps(wsdl, type) {
  var ext = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  _.forEach(type.extendedBy, function (extType) {
    var name = wsdl.getTypeName(extType);
    var typeInfo = wsdl.getType(extType);
    if (!_.has(ext, '["' + name + '"]')) {
      ext[name] = {
        type: extType,
        props: _.union(_.map(typeInfo.elements, 'name'), _.map(typeInfo.attributes, 'name'))
      };
      getExtProps(wsdl, typeInfo, ext);
    }
  });
  return ext;
}

function typeMatch(wsdl, type, data) {
  var bestMatch = type;
  var info = wsdl.getType(type);
  var props = _.union(_.map(info.elements, 'name'), _.map(info.attributes, 'name'));
  var dataKeys = _.keys(data);
  var inter = _.intersection(props, dataKeys).length;
  if (inter === dataKeys.length) return bestMatch;
  var ext = getExtProps(wsdl, info);

  _.forEach(ext, function (e, n) {
    var currentInter = _.intersection(e.props, dataKeys).length;
    if (currentInter > inter) {
      inter = currentInter;
      bestMatch = e.type;
    }
  });

  return bestMatch;
}

function serialize(wsdl, typeCoord, data) {
  var context = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  var parentType = context.parentType,
      nsUsed = context.nsUsed;

  var obj = {};
  var prefix = wsdl.getNSPrefix(typeCoord);
  var type = wsdl.getType(typeCoord);
  var base = type.base;
  nsUsed = nsUsed ? _.union(nsUsed, [prefix]) : [prefix];

  if (base) {
    obj = !wsdl.isBuiltInType(base) ? serialize(wsdl, base, data, context).obj : { '#text': data.value };
  }

  // set element values
  _.forEach(type.elements, function (el) {
    if (el.name && el.type) {
      var val = _.get(data, '["' + el.name + '"]');
      if (val !== undefined) {
        if (wsdl.isMany(el)) {
          if (_.isArray(val)) {
            obj[prefix + ':' + el.name] = _.map(val, function (v) {
              var t = typeMatch(wsdl, el.type, v);
              var typeName = wsdl.getTypeName(t);
              var typePrefix = wsdl.getNSPrefix(t);
              var isSimple = wsdl.isSimpleType(t);

              return isSimple ? wsdl.convertValue(t, v) : serialize(wsdl, t, v, {
                parentType: [typePrefix, typeName].join(':'),
                nsUsed: nsUsed
              }).obj;
            });
          }
        } else {
          var t = typeMatch(wsdl, el.type, val);
          var typeName = wsdl.getTypeName(t);
          var typePrefix = wsdl.getNSPrefix(t);
          var isSimple = wsdl.isSimpleType(t);

          obj[prefix + ':' + el.name] = isSimple ? wsdl.convertValue(t, val) : serialize(wsdl, t, val, {
            parentType: [typePrefix, typeName].join(':'),
            nsUsed: nsUsed
          }).obj;
        }
      }
    }
  });

  // set attributes
  _.forEach(type.attributes, function (attr) {
    if (attr.name) {
      var val = _.get(data, '["' + attr.name + '"]');
      if (val !== undefined) {
        if (attr.type && wsdl.isSimpleType(attr.type)) val = wsdl.convertValue(attr.type, val);
        obj['@' + attr.name] = val;
      }
    }
  });
  if (!obj['@' + XSI_PREFIX + ':type'] && parentType) obj['@' + XSI_PREFIX + ':type'] = parentType;
  return { obj: obj, nsUsed: nsUsed };
}

function deserialize(wsdl, type, node) {
  var context = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};

  if (!node.textContent) return undefined;
  var xsiPrefix = context.xsiPrefix;

  var xsiType = node.getAttribute(xsiPrefix + ':type');
  type = xsiType ? wsdl.getTypeByLocalNS(node.namespaceURI, xsiType) : type;

  var typeDef = wsdl.getType(type);
  var typeIsMany = wsdl.isMany(typeDef);
  var obj = typeIsMany ? [] : {};

  if (typeDef.base && wsdl.isBuiltInType(wsdl.getTypeRoot(typeDef.base))) {
    obj = { value: wsdl.convertValue(typeDef.base, node.textContent) };
  }

  if (wsdl.isSimpleType(type)) return wsdl.convertValue(type, node.textContent);

  _.forEach(typeDef.elements, function (el) {
    var isMany = wsdl.isMany(el) || typeIsMany;
    if (isMany && !typeIsMany && el.name) obj[el.name] = [];

    _.forEach(node.childNodes, function (node) {
      if (node.localName === el.name) {
        var o = deserialize(wsdl, el.type, node, context);
        if (o !== undefined) {
          if (isMany) {
            if (typeIsMany) obj.push(o);else obj[el.name].push(o);
          } else {
            obj[el.name] = o;
          }
        }
      }
    });
  });
  _.forEach(typeDef.attributes, function (attr) {
    var name = attr.name,
        type = attr.type;

    if (name && type) {
      var val = node.getAttribute(name);
      if (val) obj[name] = wsdl.convertValue(type, val);
    }
  });
  return obj;
}

function processFault(wsdl, fault, context) {
  var faultCode = getNodeData(firstNode(fault.getElementsByTagName('faultcode')));
  var faultString = getNodeData(firstNode(fault.getElementsByTagName('faultstring')));
  var faultNode = getFirstChildElement(firstNode(fault.getElementsByTagName('detail')));
  var typeAttr = wsdl.getTypeAttribute(faultNode);
  var faultTypeName = typeAttr.value || typeAttr.nodeValue || faultNode.localName;
  var faultType = wsdl.getTypeByLocalNS(faultNode.namespaceURI, faultTypeName);

  return {
    faultCode: faultCode,
    message: faultString,
    type: faultTypeName,
    detail: deserialize(wsdl, faultType, faultNode, context)
  };
}

function createServices(wsdl) {
  var _this = this;

  var services = {};
  _.forEach(wsdl.metadata.namespaces, function (namespace, nsIdx) {
    _.forEach(namespace.ports, function (port, portIdx) {
      var soapVars = _.find(SOAP, { version: port.soapVersion });
      _.forEach(port.operations, function (opName, opIdx) {
        var opPath = '["' + port.service + '"]["' + port.name + '"]["' + opName + '"]';
        _.set(services, opPath, function (data, options, callback) {
          if (_.isFunction(options)) {
            callback = options;
            options = {};
          }
          callback = _.isFunction(callback) ? callback : function () {
            return false;
          };

          return new Promise(function (resolve, reject) {
            var _envelope;

            var endpoint = getEndpointFromPort(_this, port);

            var _wsdl$getOp = wsdl.getOp([nsIdx, portIdx, opIdx]),
                _wsdl$getOp2 = slicedToArray(_wsdl$getOp, 2),
                input = _wsdl$getOp2[0],
                output = _wsdl$getOp2[1];

            var soapAction = input.action;
            var opName = input.name;
            var inputTypePrefix = wsdl.getNSPrefix(input.type);

            var _serialize = serialize(wsdl, input.type, data),
                obj = _serialize.obj,
                nsUsed = _serialize.nsUsed;

            var envelope = (_envelope = {}, defineProperty(_envelope, '@xmlns:' + SOAPENV_PREFIX, soapVars.envelope), defineProperty(_envelope, '@xmlns:' + SOAPENC_PREFIX, soapVars.encoding), defineProperty(_envelope, '@xmlns:' + XSI_PREFIX, XSI_NS), defineProperty(_envelope, '@xmlns:' + XS_PREFIX, XS_NS), _envelope);
            var header = {};
            var body = {};

            _.forEach(_.union(nsUsed, [inputTypePrefix]), function (prefix) {
              body['@xmlns:' + prefix] = wsdl.getNSURIByPrefix(prefix);
            });

            body[inputTypePrefix + ':' + opName] = obj;
            envelope[SOAPENV_PREFIX + ':Header'] = header;
            envelope[SOAPENV_PREFIX + ':Body'] = body;

            var inputXML = xmlbuilder.create(defineProperty({}, SOAPENV_PREFIX + ':Envelope', envelope)).end({
              pretty: true,
              encoding: _this.options.encoding || 'UTF-8'
            });

            var headers = {
              'Content-Type': soapVars.contentType,
              'Content-Length': inputXML.length,
              'SOAPAction': soapAction,
              'User-Agent': _this.options.userAgent
            };
            _this._security.addHttpHeaders(headers);

            var requestObj = { headers: headers, url: endpoint, body: inputXML };
            _this.emit('soap.request', requestObj);
            request.post(requestObj, function (error, res, body) {
              if (error) {
                var errResponse = { error: error, res: res, body: body };
                _this.emit('soap.error', errResponse);
                callback(errResponse);
                return reject(errResponse);
              }
              _this.lastResponse = res;
              var doc = new xmldom.DOMParser().parseFromString(body);
              var soapEnvelope = firstNode(doc.getElementsByTagNameNS(soapVars.envelope, 'Envelope'));
              var soapBody = firstNode(doc.getElementsByTagNameNS(soapVars.envelope, 'Body'));
              var soapFault = firstNode(soapBody.getElementsByTagNameNS(soapVars.envelope, 'Fault'));
              var xsiPrefix = _.findKey(soapEnvelope._nsMap, function (nsuri) {
                return nsuri === XSI_NS;
              });
              var context = { xsiPrefix: xsiPrefix };

              if (soapFault) {
                var fault = processFault(wsdl, soapFault, context);
                _this.emit('soap.fault', { fault: fault, res: res, body: body });
                callback(fault);
                return reject(fault);
              }

              var result = deserialize(wsdl, output.type, getFirstChildElement(soapBody), context);
              _this.emit('soap.response', { res: res, body: body });
              callback(null, result);
              return resolve(result);
            });
          });
        });
      });
    });
  });
  return services;
}

var VERSION = '0.1.0';

var SoapConnectClient = function (_EventEmitter) {
  inherits(SoapConnectClient, _EventEmitter);

  function SoapConnectClient(wsdlAddress, options, callback) {
    var _ret;

    classCallCheck(this, SoapConnectClient);

    var _this = possibleConstructorReturn(this, (SoapConnectClient.__proto__ || Object.getPrototypeOf(SoapConnectClient)).call(this));

    if (!_.isString(wsdlAddress)) throw new Error('No WSDL provided');
    if (_.isFunction(options)) {
      callback = options;
      options = {};
    }
    callback = _.isFunction(callback) ? callback : function () {
      return false;
    };
    options.endpoint = options.endpoint || url.parse(wsdlAddress).host;
    _this.options = options;
    _this.options.userAgent = _this.options.userAgent || 'soap-connect/' + VERSION;
    _this.types = {};
    _this.lastResponse = null;
    _this._security = new Security.Security();

    if (options.ignoreSSL) process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    return _ret = WSDL$1(wsdlAddress, options).then(function (wsdlInstance) {
      _this.wsdl = wsdlInstance;
      _this.types = createTypes(wsdlInstance);
      _this.services = createServices.call(_this, wsdlInstance);

      // return the client
      callback(null, _this);
      return _this;
    }).catch(function (err) {
      callback(err);
      return Promise.reject(err);
    }), possibleConstructorReturn(_this, _ret);
  }

  createClass(SoapConnectClient, [{
    key: 'setSecurity',
    value: function setSecurity(security) {
      if (!(security instanceof Security.Security)) throw new Error('Invalid security object');
      this._security = security;
    }
  }]);
  return SoapConnectClient;
}(EventEmitter);

function createClient (mainWSDL) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var callback = arguments[2];

  return new SoapConnectClient(mainWSDL, options, callback);
}

var index = {
  createClient: createClient,
  Security: Security
};

exports.SoapConnectClient = SoapConnectClient;
exports.Security = Security;
exports['default'] = index;