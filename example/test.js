var client = require('../lib');
var util   = require('util');
var _ = require('lodash');
var fs = require('fs');
var cred = require('../credentials');

// sample soap services for credentials file
//module.exports = {wsdl: 'http://www.webservicex.net/CurrencyConvertor.asmx?WSDL'};
//module.exports = {wsdl: 'http://www.webservicex.com/globalweather.asmx?wsdl'};
//module.exports = {wsdl: 'http://wsf.cdyne.com/WeatherWS/Weather.asmx?WSDL'};
//module.exports = {wsdl: 'http://www.thomas-bayer.com/axis2/services/BLZService?wsdl'};


process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

client.client(cred.wsdl, {cache: true}).then(function(wsdl) {
	//console.log(wsdl._meta);
	
	fs.writeFileSync('out.txt', JSON.stringify(wsdl._meta, null, '  '));

	/*
	var port = wsdl.vim25Service.VimService.VimPort;
	
	//console.log(_.keys(port).sort());
	port.RetrieveServiceContent({
		_this: 'ServiceInstance'
	});
	*/
	
	/*
	console.log(JSON.stringify(wsdl.vim25.KeyAnyValue(), null, '  '));
	console.log(JSON.stringify(wsdl.vim25.KeyAnyValue({
		dynamicProperty: {
			val: '100',
			//name: 'hi'
		},
		dynamicType: 1,
		key: 'imakey',
		value: 100
	}), null, '  '));
	 */
});