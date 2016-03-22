module.exports = function(env) {
	
	var _ = env.lodash;
	var url = env.url;
	
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
	function getTag(tag) {
		var t = nsplit(tag.tagName || tag.nodeName);
		if (t.name) {
			tag._name = t.name;
			tag._prefix = t.prefix;
			return tag;
		}
		return null;
	}
	function cleanTag(tag) {
		return _.omit(tag.obj, ['ownerDocument', 'previousSibling', 'nextSibling', 'firstChild', 'lastChild']);
	}
	
	function metaify(metaPrefix) {
		return function(name) {
			return metaPrefix + name;
		};
	}
	
	function getURI(loc, baseURI) {
		var parsed = url.parse(loc);
		return parsed.host ? loc : url.resolve(baseURI, loc);
	}
	
	
	return {
		isMeta: isMeta,
		_equals: _equals,
		equals: equals,
		iequals: iequals,
		attrName: attrName,
		attrValue: attrValue,
		tagType: tagType,
		getType: getType,
		nsplit: nsplit,
		getTag: getTag,
		cleanTag: cleanTag,
		metaify: metaify,
		getURI: getURI
	};
	
};