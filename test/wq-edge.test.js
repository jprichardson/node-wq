var wq = require('../lib/wq.js')
  , dq = require('dq')
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
  
    describe('> when the enqueuing strings', function() {
      it('should allow the user to modify the string or object and save to done queue', function(done) {
        var data = ['JP', 'Leslie', 'Chris']
        var outputData = []
        batch(data).seq().each(function(i, item, next) {
          q.enq(item, i, next)
        })
        .error(done)
        .end(function() {
          batch(data).seq().each(function(i, item, next) {
            q.deq(function(err, item) {
              if (err) return done(err)
              item.data = {name: item.data} //create object
              item.done(next)
            })
          })
          .error(done)
          .end(function() {
            dq.create({name: 'wq:done:wqtest'}, function(err, dataq) {
              if (err) return done(err)
              batch(data).seq().each(function(i, item, next) {
                dataq.deq(function(err, item) { //item is now raw string representation from dq
                  outputData.push(JSON.parse(item))
                  next()
                })
              })
              .error(done)
              .end(function() {
                data.forEach(function(name) {
                  T (outputData.some(function(i) { return i.name === name}))
                })
                done()
              })
            })
          })
        })
      })
    })
  })
})

