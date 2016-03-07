var client = require('../lib');
var util   = require('util');
var dotp   = require('dotprune');
var _ = require('lodash');


client.wsdl('https://vcenter01.home.local/sdk/vimService.wsdl').then(function(wsdl) {
	
	
	//console.log(JSON.stringify(wsdl.metadata.schemas['urn:vim25'].DynamicData, null, '  '));
	//console.log(JSON.stringify(wsdl.metadata.schemas['urn:vim25'].ConfigSpecOperation, null, '  '));
	//console.log(JSON.stringify(wsdl.metadata.schemas['urn:vim25'].ManagedObjectReference, null, '  '));	
	console.log(JSON.stringify(wsdl.metadata.operations['urn:vim25'].UpdateInternetScsiAuthenticationProperties, null, '  '));
	
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