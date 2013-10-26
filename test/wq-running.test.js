var wq = require('../lib/wq.js')
  , testutil = require('testutil')
  , batch = require('batchflow')
  , stats = require('../lib/stats')
  , nf = require('nextflow')

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
      stats.destroy(q, done)
    })
  })

  describe('- moveAllFrom()', function() {
    describe('> there are 1 in waiting and 2 in running', function() {
      it('should enq them and then deq them', function(done) {
        var count = 0
        var data = [{name: 'JP'}, {name: 'Leslie'}, {name: 'Chris'}]
        
        //var flow
        nf(flow = {
          ERROR: done,
          loadUpData: function() {
            batch(data).seq().each(function(i, item, next) { q.enq(item, i, next) }).error(done).end(flow.next)
          },
          deqItems: function() {
            q.deq(function(err, item) {
              EQ (item.data.name, 'JP')
              q.deq(function(err, item) {
                EQ (item.data.name, 'Leslie')
                flow.next()
              })
            })
          },
          currentCount: function() {
            q.count(function(err, counts) {
              EQ (counts.waiting, 1)
              EQ (counts.running, 2)
              EQ (counts.done, 0)
              flow.next()
            })
          },
          doTheMove: function() {
            q.moveAllFrom(q.qRunning, q.qWaiting, flow.next)
          },
          currentCount2: function() {
            q.count(function(err, counts) {
              EQ (counts.waiting, 3)
              EQ (counts.running, 0)
              EQ (counts.done, 0)
              flow.next()
            })
          },
          end: function() {
            done()
          }
        })
      })
    })
  })
})

