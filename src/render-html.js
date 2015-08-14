let {Rx} = require(`@cycle/core`)
let toHTML = require(`vdom-to-html`)
let {transposeVTree} = require(`./transposition`)

function makeResponseGetter() {
  return function get(selector) {
    if (selector === `:root`) {
      return this
    } else {
      return Rx.Observable.empty()
    }
  }
}

function makeHTMLDriver() {
  return function htmlDriver(vtree$) {
    let output$ = vtree$.flatMapLatest(transposeVTree).last().map(toHTML)
    output$.get = makeResponseGetter()
    return output$
  }
}

module.exports = {
  makeHTMLDriver,
}
