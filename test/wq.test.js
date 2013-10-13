var wq = require('../lib/wq.js')
  , testutil = require('testutil')
  , batch = require('batchflow')

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
      done()
    })
  })

  describe('queue counts', function() {
    describe('> when three objects are enqueued', function() {
      it('the waiting q should have a count of 3 and others have a count of 0', function(done) {
        var data = [{name: 'JP'}, {name: 'Leslie'}, {name: 'Chris'}]
        batch(data).seq().each(function(i, item, next) {
          q.enq(item, i, next)
        })
        .error(done)
        .end(function() {
          q.count(function(err, counts) {
            if (err) return done(err)
            EQ (counts.waiting, 3)
            EQ (counts.running, 0)
            EQ (counts.done, 0)
            done()
          })
        })
      })
    })

    describe('> when three objects are enqueued and one is dequeued', function() {
      it('the waiting q should have a count of 2 and running should have a count of 1 and done should have a count of 0', function(done) {
        var data = [{name: 'JP'}, {name: 'Leslie'}, {name: 'Chris'}]
        batch(data).seq().each(function(i, item, next) {
          q.enq(item, i, next)
        })
        .error(done)
        .end(function() {
          q.deq(function(err, item) {
            if (err) return done(err)
            EQ (item.data.name, 'JP')
            q.count(function(err, counts) {
              if (err) return done(err)
              EQ (counts.waiting, 2)
              EQ (counts.running, 1)
              EQ (counts.done, 0)
              done()
            })
          })
        })
      })
    })
  })
})