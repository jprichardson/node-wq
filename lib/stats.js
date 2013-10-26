var redis = require('redis')

var me = module.exports

me.TEST_KEY_SYSTEM_TOTAL = 'total:test-system'
me.TEST_KEY_SYSTEM_TIME = 'time:test-system'
me.STATS_KEY = 'wq:stats'


me.itemDone = function(wq, startTime, callback) {
  if (typeof wq != 'object') throw new Error('wq must be an object')

  var endTime = new Date().getTime()
  var deltaSecs = (endTime - startTime) / 1000

  var fields = me.fields(wq.name)

  var rc = wq.redisClient
  rc.hincrbyfloat('wq:stats', fields.sysTime, deltaSecs, function(err, systemTime) {
    if (err) return callback(err)
    rc.hincrby('wq:stats', fields.sysTotal, 1, function(err, systemTotal) {
      if (err) return callback(err)
      rc.hincrbyfloat('wq:stats', fields.queueTime, deltaSecs, function(err, queueTime) {
        if (err) return callback(err)
        rc.hincrby('wq:stats', fields.queueTotal, 1, function(err, queueTotal) {
          if (err) return callback(err)
          callback(null, {sysTotal: systemTotal, sysTime: +systemTime, queueTotal: queueTotal, queueTime: +queueTime})
        })
      })
    })
  })
}

me.destroy = function(wq, callback) {
  if (typeof wq != 'object') throw new Error('wq must be an object')
  
  var fields = me.fields(wq.name)
  fields = Object.keys(fields).map(function(k) { return fields[k] })
  
  !function del () {
    if (fields.length == 0) return callback()
    wq.redisClient.hdel(me.STATS_KEY, fields.pop(), function(err) {
      if (err) return callback(err)
      del()
    })
  }()
}

//
me.fields = function(wqName) {
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