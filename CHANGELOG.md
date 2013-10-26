0.1.0 / 2013-10-26
------------------
* fix stats name `undefined`. Closes #4
* implemented moveAllFrom(), primarily to move all from running back to waiting, Closes #1
* Now supports done method even if done queue doesn't exist. Closes #3

0.0.2 / 2013-10-15
------------------
* allow user to modify data before calling done() on dequeued item
* defined behavior when `deq()` is called when waiting queue is empty

0.0.1 / 2013-10-13
------------------
* initial release

