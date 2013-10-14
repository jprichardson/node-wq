var redis = require('redis')

var me = module.exports

me.TEST_KEY_SYSTEM_TOTAL = 'wq:stats:done:test-system'
me.TEST_KEY_SYSTEM_TIME = 'wq:stats:time:test-system'

me.itemDone = function(startTime, callback) {
  var endTime = new Date().getTime()
  var deltaSecs = (endTime - startTime) / 1000

  var keys = me.keys.call(this)

  var rc = this.redisClient
  rc.incrbyfloat(keys.sysTime, deltaSecs, function(err, systemTime) {
    if (err) return callback(err)
    rc.incr(keys.systemTotal, function(err, systemTotal) {
      if (err) return callback(err)
      rc.incrbyfloat(keys.queueTime, deltaSecs, function(err, queueTime) {
        if (err) return callback(err)
        rc.incr(keys.queueTotal, function(err, queueTotal) {
          if (err) return callback(err)
          callback(null, {sysTotal: systemTotal, sysTime: +systemTime, queueTotal: queueTotal, queueTime: +queueTime})
        })
      })
    })
  })
}

me.keys = function() {
  var keys = {queueTotal: 'wq:stats:done:' + this.name, queueTime: 'wq:stats:time:' + this.name}

  if (process.env.NODE_ENV === 'test') {
    keys.sysTotal = me.TEST_KEY_SYSTEM_TOTAL
    keys.sysTime = me.TEST_KEY_SYSTEM_TIME
  } else {
    keys.sysTotal = 'wq:stats:done:system'
    keys.sysTime = 'wq:stats:time:system'
  }

  return keys
}