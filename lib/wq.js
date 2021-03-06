var dq = require('dq')
  , stats = require('./stats')

//this is shitty code

var me = module.exports

var PREFIX = 'wq'

me.WorkerQueue = WorkerQueue

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

//right now, only one that can be null is qDone
function WorkerQueue (name, qWaiting, qRunning, qDone) {
  this.hasQuit = false
  this.waitingCount = 0
  this.qWaiting = qWaiting
  this.qRunning = qRunning
  this.qDone = qDone
  this.redisClient = qWaiting.redisClient

  this.name = name
}

//put this somewhere else
function countQ(q, callback) {
  if (q == null) return callback(null, 0)
  q.count(callback)
}


WorkerQueue.prototype.count = function(callback) {
  var counts = {}
  var that = this
  countQ(this.qWaiting, function(err, count) {
    if (err) return callback(err)
    counts.waiting = count
    countQ(that.qRunning, function(err, count) {
      if (err) return callback(err)
      counts.running = count
      countQ(that.qDone, function(err, count) {
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

    //no err and no data => qWaiting is empty, this will change in the future
    if (!err && typeof data == 'undefined')
      return callback(new Error("qWaiting is empty."))

    that.qRunning.enq(data, that.waitingCount, function(err) { 
      if (err) return callback(err)

      try {
        data = JSON.parse(data)
      } catch (err) {}

      var wrap = {data: data, idx: that.waitingCount, start: new Date().getTime()}
      that.waitingCount += 1
      wrap.done = function(doneCallback) {
        var rc = that.redisClient
        var k = that.qRunning.key
        rc.zremrangebyscore(k, wrap.idx, wrap.idx, function(err, res) {
          if (err) return doneCallback(err)
          if (res === 0) return doneCallback(new Error('remove from q running failed'))
            
          if (typeof wrap.data == 'object')
            data = JSON.stringify(wrap.data)
        
          if (that.qDone != null) {
            that.qDone.enq(data, function(err) {
              if (err) return doneCallback(err)
              stats.itemDone(that, wrap.start, doneCallback)
            })
          } else { //don't put it in the done queue since it doesn't exist
            stats.itemDone(that, wrap.start, doneCallback)
          }
        })
      }

      callback(null, wrap)
    })
  })
}

WorkerQueue.prototype.moveAllFrom = function(src, dest, callback) {
  if (src === dest) return callback(new Error('src should not be the same as dest'))
  var count = 0
  !function deqenq() {
    src.deq(function(err, item) {
      if (err || item == null) return callback(err, count) //should exit here without problem
      dest.enq(item, function(err) {
        if (err) return callback(err, count)
        count += 1
        deqenq()
      })
    })
  }()
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



