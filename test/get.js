var wifi = require('wifi-cc3000');

if (wifi.isConnected()){
  runTest();
} else {
  wifi.on('connect', function(){
    runTest();
  });  
}

function runTest(){
  var http = require('http');
  var https = require('https');
  var test = require('tinytap');
  var async = require('async');

  var MAX = 10;
  // two test per request + mem check at the end
  // multiply by 2 for http & https
  test.count((MAX*2+1)*2);

  // declare this here so that we have constant mem
  var memUsage = new Array(MAX); 
  var maxMemDifference = 20000; // in bytes
  var count = 0;

  function loop(t, h) {
    var req = h.request( 
      { hostname: 'httpbin.org',
        path: '/get?200=OK',
        method: 'GET'} 
      , function(res) {
        // make sure we get a 200 response code
        t.equal(200, res.statusCode, "status code should be 200, got: "+res.statusCode);

        res.on('data', function(chunk) { 

          var parseChunk = JSON.stringify(JSON.parse(chunk).args);
          // make sure data is 200
          t.equal(parseChunk, "{\"200\":\"OK\"}", "data should be '{\"200\":\"OK\"}', got: "+parseChunk);

        });
      
        res.on('end', function(){
          global._G.collectgarbage.call('collect')
          memUsage[count] = process.memoryUsage().heapUsed;
          if (count < (MAX-1)) {
            count++;
            setTimeout(function(){
              loop(t, h);
            }, 100);  
          } else {
            // check mem usage to be relatively constant
            var diff = Math.max.apply(Math, memUsage) - Math.min.apply(Math, memUsage);

            if ( diff > maxMemDifference) {
              // not ok
              t.ok(false, "Mem changed too much throughout test. Usage is: "+memUsage);
            } else {
              // ok
              t.ok(true, "Mem usage was "+diff);
            }
            // end test
            count = 0;
            t.end();
          }
        });
      });

    req.on('error', function(e) { 
      // not ok
      t.ok(false, "Problem with request: "+e.message);
      count = 0;
      t.end();
    });
    
    req.end();
  }

  async.series([
    test('HTTP request.get test', function(t){
      loop(t, http);
    }), 
    test('HTTPS request.get test', function(t){
      loop(t, https);
    })
  ]);  
}

process.ref();
