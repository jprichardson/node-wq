var redis = require('redis')

var me = module.exports

me.TEST_KEY_SYSTEM_TOTAL = 'total:test-system'
me.TEST_KEY_SYSTEM_TIME = 'time:test-system'

me.itemDone = function(startTime, wqName, callback) {
  var endTime = new Date().getTime()
  var deltaSecs = (endTime - startTime) / 1000

  var keys = me.fields(wqName)

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

//
me.fields = function(wqName) {
  if (wqName == null) throw new Error('Must set wq name.')
  if (typeof wqName != 'string') throw new Error('wq name must be a string.')

  var fields = {queueTotal: 'total:' + wqName, queueTime: 'time:' + wqName}

  if (process.env.NODE_ENV === 'test') {
    fields.sysTotal = me.TEST_KEY_SYSTEM_TOTAL
    fields.sysTime = me.TEST_KEY_SYSTEM_TIME
  } else {
    fields.sysTotal = 'total:system'
    fields.sysTime = 'time:system'
  }

  return fields
}