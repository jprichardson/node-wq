var redis = require('redis')

var me = module.exports

me.itemCompleted = function(startTime) {
  var endTime = new Date().getTime()
  var deltaSecs = (endTime - startTime) / 1000

  if (process.env.NODE_ENV === 'test') {
    var keySystemTotal = 'wq:stats:done:system'
    var keySystemTime = 'wq:stats:time:system'
  } else {
    var keySystemTotal = 'wq:stats:done:system'
    var keySystemTime = 'wq:stats:time:system'
  }

  var keyQueueTotal = 'wq:stats:done:' + this.name
  var keyQueueTime = 'wq:stats:time:' + this.name

  var rc = this.redisClient
  rc.incrby
}