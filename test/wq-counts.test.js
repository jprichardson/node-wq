
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
      stats.destroy(q, done)
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

  describe('> when three objects are enqueued and two are dequeued and one is done', function() {
    it('the waiting q should have a count of 1 and running should have a count of 1 and done should have a count of 1', function(done) {
      var data = [{name: 'JP'}, {name: 'Leslie'}, {name: 'Chris'}]
      batch(data).seq().each(function(i, item, next) {
        q.enq(item, i, next)
      })
      .error(done)
      .end(function() {
        q.deq(function(err, item) {
          if (err) return done(err)
          EQ (item.data.name, 'JP')
          item.done(function(err) {
            if (err) return done(err)
            q.deq(function(err, item) {
              if (err) return done(err)
              q.count(function(err, counts) {
                if (err) return done(err)
                EQ (counts.waiting, 1)
                EQ (counts.running, 1)
                EQ (counts.done, 1)
                done()
              })
            })
          })
        })
      })
    })
  })

  describe('> when three objects are done', function() {
    it('the waiting q should have a count of 0 and running should have a count of 0 and done should have a count of 3', function(done) {
      var data = [{name: 'JP'}, {name: 'Leslie'}, {name: 'Chris'}]
      var doneData = []

      batch(data).seq().each(function(i, item, next) {
        q.enq(item, i, next)
      })
      .error(done)
      .end(function() {
        batch([1,2,3]).seq().each(function(i, item, next) {
          q.deq(function(err, item) {
            if (err) return done(err)
            doneData.push(item)
            next()
          })
        }).error(done)
        .end(function() {
          EQ (doneData.length, 3)
          q.count(function(err, counts) {
            if (err) return done(err)
            EQ (counts.waiting, 0)
            EQ (counts.running, 3)
            EQ (counts.done, 0)
            batch(doneData).par().each(function(i, item, next) {
              setTimeout(function() {
                item.done(function(err) {
                  if (err) return done(err)
                  next()
                })
              }, Math.random()*50) //<--- simulate different times done
            }).error(done)
            .end(function() {
              q.count(function(err, counts) {
                if (err) return done(err)
                EQ (counts.waiting, 0)
                EQ (counts.running, 0)
                EQ (counts.done, 3)
                done()
              })
            })
          })
        })
      })
    })
  })
})

