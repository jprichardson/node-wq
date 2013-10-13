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

  describe('test type conversions', function() {
    describe('> when three objects are enq', function() {
      it('should enq them and then deq them', function(done) {
        var count = 0
        var data = [{name: 'JP'}, {name: 'Leslie'}, {name: 'Chris'}]
        batch(data).seq().each(function(i, item, next) {
          q.enq(item, i, next)
        })
        .error(done)
        .end(function() {
          batch(data).seq().each(function(i, item, next) {
            q.deq(function(err, item) {
              if (err) return done(err)
              EQ (data[i].name, item.data.name)
              count += 1
              next()
            })
          })
          .error(done)
          .end(function() {
            EQ (count, 3)
            done()
          })
        })
      })
    })

    describe('> when three strings are enq', function() {
      it('should enq them and then deq them', function(done) {
        var count = 0
        var data = ['JP', 'Leslie', "Chris"]
        batch(data).seq().each(function(i, item, next) {
          q.enq(item, i, next)
        })
        .error(done)
        .end(function() {
          batch(data).seq().each(function(i, item, next) {
            q.deq(function(err, item) {
              if (err) return done(err)
              EQ (data[i], item.data)
              count += 1
              next()
            })
          })
          .error(done)
          .end(function() {
            EQ (count, 3)
            done()
          })
        })
      })
    })
  })
})

