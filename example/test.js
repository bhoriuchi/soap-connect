var client = require('../lib');


client.wsdl.parse('https://vcenter01.home.local/sdk/vimService.wsdl', {ignoreSSL: true}).then(function(data) {
	console.log(JSON.stringify(data, null, '  '));
});