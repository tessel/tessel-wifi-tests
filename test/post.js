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

  var data = JSON.stringify({a: 200, b: "test", c: {d: "some data"}});

  function loop(t, h) {
    var req = h.request(
      { hostname: 'httpbin.org',
        path: '/post',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      }, function(res) {
        var buffer = "";
        // make sure we get a 200 response code
        t.equal(200, res.statusCode, "status code should be 200, got: "+res.statusCode);

        res.on('data', function(chunk) { 
          buffer += chunk;
        });
      
        res.on('end', function(){
          var retval = JSON.stringify(JSON.parse( buffer ).json);
          // make sure its equal to what we sent
          t.equal(retval, data, "data should be "+data+", got: "+retval);

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
            t.end();
          }
        });
      });

    req.on('error', function(e) { 
      // not ok
      t.ok(false, "Problem with request: "+e.message);
      t.end();
    });
    
    req.write( data );
    req.write('\n');

    req.end();
  }

  async.series([
    test('HTTP request.post test', function(t){
      loop(t, http);
    }), 
    test('HTTPS request.post test', function(t){
      loop(t, https);
    })
  ]);  
}
