var wifi = require('wifi-cc3000');

if (wifi.isConnected()){
  runTest();
} else {
  wifi.on('connect', function(){
    runTest();
  });  
}

function runTest(){
  var test = require('tinytap');

  test('request lib test', function(t){
    var request = require('request');
    var data = JSON.stringify({foo: 'bar'});
    request(
      { method: 'PUT'
      , uri: 'http://httpbin.org' + '/put'
      , body: data
      }
    , function (error, response, body) {
        t.equal(data, JSON.stringify(JSON.parse(body).json), "request lib did not send back correct data");
        t.end();
      }
    )
  });
}
