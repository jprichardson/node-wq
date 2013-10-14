var redis = require('redis')
  , dq = require('dq')

var me = module.exports

var PREFIX = 'wq'

me.create = function (params, callback) {
  if (!params.name) throw new Error('You must pass a name to the create() function.')
  if (params.name === 'system') throw new Error('"System" is a reserved wq name for stats.')

  var name = params.name
  var names = buildNames(params.name)

  var qWaiting, qRunning, qDone = null

  if (params.redisClient == null) {
    params.name = names.waiting
    dq.create(params, function(err, q) {
      if (err) return callback(err)
      qWaiting = q
      params.redisClient = q.redisClient
      createOtherQs()
    })
  } else {
    dq.createFromRedisClient(names.waiting, params.redisClient, function(err, q) {
      if (err) return callback(err)
      qWaiting = q
      createOtherQs()
    })
  }

  function createOtherQs() {
    dq.createFromRedisClient(names.running, params.redisClient, function(err, q) {
      if (err) return callback(err)
      qRunning = q
      dq.createFromRedisClient(names.done, params.redisClient, function(err, q) {
        if (err) return callback(err)
        qDone = q
        finish()
      })
    })
  }

  function finish() {
    var wq = new WorkerQueue(name, qWaiting, qRunning, qDone)
    callback(null, wq)
  }
}

me.destroy = function (params, callback) {
  me.create(params, function(err, wq) {
    wq.qWaiting.destroy(true, function(err) {
      if (err) return callback(err)
      wq.qRunning.destroy(true, function(err) {
        if (err) return callback(err)
        wq.qDone.destroy(true, function(err) {
          if (err) return callback(err)
          wq.qWaiting.redisClient.quit(callback)
        })
      })
    })
  })
}

function WorkerQueue (name, qWaiting, qRunning, qDone) {
  this.hasQuit = false
  this.waitingCount = 0
  this.qWaiting = qWaiting
  this.qRunning = qRunning
  this.qDone = qDone
  this.redisClient = qWaiting.redisClient
}

WorkerQueue.prototype.count = function(callback) {
  var counts = {}
  var that = this
  this.qWaiting.count(function(err, count) {
    if (err) return callback(err)
    counts.waiting = count
    that.qRunning.count(function(err, count) {
      if (err) return callback(err)
      counts.running = count
      that.qDone.count(function(err, count) {
        if (err) return callback(err)
        counts.done = count
        callback(null, counts)
      })
    })
  })
}

WorkerQueue.prototype.enq = function(val, priority, callback) {
  if (typeof priority == 'function') {
    callback = priority
    priority = -Infinity
  }

  if (callback == null) callback = function(){}

  if (typeof val == 'object')
    val = JSON.stringify(val)

  this.qWaiting.enq(val, priority, callback)
}

WorkerQueue.prototype.deq = function(callback) {
  var that = this
  this.qWaiting.deq(function(err, data) {
    if (err) return callback(err)
    that.qRunning.enq(data, that.waitingCount, function(err) { 
      if (err) return callback(err)

      try {
        data = JSON.parse(data)
      } catch (err) {}

      var wrap = {data: data, idx: that.waitingCount, start: new Date().getTime()}
      that.waitingCount += 1
      wrap.done = function(doneCallback) {
        var rc = that.qWaiting.redisClient
        var k = that.qRunning.key
        rc.zremrangebyscore(k, wrap.idx, wrap.idx, function(err, res) {
          if (err) return doneCallback(err)
          if (res === 0) return doneCallback(new Error('remove from q running failed'))
            
          if (typeof data == 'object')
            data = JSON.stringify(data)
        
          that.qDone.enq(data, function(err) {
            if (err) return doneCallback(err)
            doneCallback()
          })
        })
      }

      callback(null, wrap)
    })
  })
}

WorkerQueue.prototype.quit = function(callback) {
  var that = this
  this.redisClient.quit(function(err) {
    if (err) return callback(err)
    that.hasQuit = true
  })
}


function buildNames(name) {
  var o = {}
  ;['waiting', 'running', 'done'].forEach(function(n) {
    o[n] = PREFIX + ':' + n + ':' + name
  })
  return o
}



