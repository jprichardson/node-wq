var wq = require('../lib/wq.js')
  , WorkerQueue = wq.WorkerQueue
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

  describe('- done()', function() {
    describe('> when the done queue doesnt exist', function() {
      it('should not put them on the done queue', function(done) {
        var data = [{name: 'JP'}, {name: 'Leslie'}, {name: 'Chris'}]
        
        //var flow
        nf(flow = {
          ERROR: done,
          removeDoneQueue: function() {
            q.qDone = null
            flow.next()
          },
          loadUpData: function() {
            batch(data).seq().each(function(i, item, next) { q.enq(item, i, next) }).error(done).end(flow.next)
          },
          deqItems: function() {
            q.deq(function(err, item1) {
              EQ (item1.data.name, 'JP')
              q.deq(function(err, item2) {
                EQ (item2.data.name, 'Leslie')
                flow.next(item1, item2)
              })
            })
          },
          finishThem: function(item1, item2) {
            item1.done(function(err) {
              F (err)
              item2.done(function(err) {
                F (err)
                flow.next()
              })
            })
          },
          currentCount: function() {
            q.count(function(err, counts) {
              EQ (counts.waiting, 1)
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

