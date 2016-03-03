var client = require('../lib');
var cred   = require('../credentials');
var util   = require('util');
var dotp   = require('dotprune');
var _ = require('lodash');

cred.wsdl = 'https://pvvapzz030.la.frd.directv.com/sdk/vimService.wsdl';


client.wsdl(cred.wsdl).then(function(wsdl) {
	
	
	console.log(JSON.stringify(wsdl.schemas['urn:vim25'].DynamicData, null, '  '));
	
	//console.log(_.keys(data));
	
	//console.log(JSON.stringify(data, null, '  '));
	
	//var de = data.documentElement;
	
	//onsole.log(de._nsMap);
	
	//var wsdlNS = data.getAttribute('xmlns');
	//console.log(wsdlNS);
	//var schemaNS = de.getElementsByTagNameNS(wsdlNS, 'types');
	
	//console.log(wsdlNS);
	//console.log(_.keys(schemaNS));
	
	//var out = data.documentElement.getElementsByTagNameNS('http://www.w3.org/2001/XMLSchema', 'include');
	
	//console.log(out['0'].attributes, out['1'].attributes, out['2'].attributes);
});