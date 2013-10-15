var wq = require('../lib/wq.js')
  , testutil = require('testutil')
  , batch = require('batchflow')
  , stats = require('../lib/stats')

var WQ_NAME = 'wqtest'
var q = null

describe('wq', function() {
  beforeEach(function(done) {
    wq.create({name: WQ_NAME}, function(err, _q) {
      if (err) return done(err)
      q = _q
      done()
    })
  })

  afterEach(function(done) {
    wq.destroy({name: WQ_NAME}, function(err) {
      if (err) return done(err)
      batch(stats.keys.call(q)).par().each(function(k,v,n) { q.redisClient.del(v, n) }).end(function(){done()})
    })
  })

  describe('edge cases', function() {
    describe('> when the waiting queue has zero items and deq() is called', function() {
      it('should return an error and undefined', function(done) {
        q.deq(function(err, item) {
          T (err)
          T (err.message.toUpperCase().indexOf('EMPTY') >= 0)
          T (typeof item == 'undefined')
          done()
        })
      })
    })
  })
})