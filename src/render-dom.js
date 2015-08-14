let {Rx} = require(`@cycle/core`)
let VDOM = {
  h: require(`./virtual-hyperscript`),
  diff: require(`virtual-dom/diff`),
  patch: require(`virtual-dom/patch`),
  parse: typeof window !== `undefined` ? require(`vdom-parser`) : () => {},
}
let {transposeVTree} = require(`./transposition`)

function wrapTopLevelVTree(vtree, rootElem) {
  const {id: vtreeId = ``} = vtree.properties
  const {className: vtreeClass = ``} = vtree.properties
  const sameId = vtreeId === rootElem.id
  const sameClass = vtreeClass === rootElem.className
  const sameTagName = vtree.tagName.toUpperCase() === rootElem.tagName
  if (sameId && sameClass && sameTagName) {
    return vtree
  }
  let attrs = {}
  if (rootElem.id) { attrs.id = rootElem.id }
  if (rootElem.className) { attrs.className = rootElem.className }
  return VDOM.h(rootElem.tagName, attrs, [vtree])
}

function makeDiffAndPatchToElement$(rootElem) {
  return function diffAndPatchToElement$([oldVTree, newVTree]) {
    if (typeof newVTree === `undefined`) { return Rx.Observable.empty() }

    let prevVTree = wrapTopLevelVTree(oldVTree, rootElem)
    let nextVTree = wrapTopLevelVTree(newVTree, rootElem)
    //console.log('%cVDOM diff and patch START', 'color: #636300')
    /* eslint-disable */
    rootElem = VDOM.patch(rootElem, VDOM.diff(prevVTree, nextVTree))
    /* eslint-enable */
    //console.log('%cVDOM diff and patch END', 'color: #636300')
    return Rx.Observable.just(rootElem)
  }
}

function renderRawRootElem$(vtree$, domContainer) {
  let diffAndPatchToElement$ = makeDiffAndPatchToElement$(domContainer)
  return vtree$
    .flatMapLatest(transposeVTree)
    .startWith(VDOM.parse(domContainer))
    .pairwise()
    .flatMap(diffAndPatchToElement$)
}

function makeRootElemToEvent$(selector, eventName) {
  return function rootElemToEvent$(rootElem) {
    if (!rootElem) {
      return Rx.Observable.empty()
    }
    //console.log(`%cget('${selector}', '${eventName}') flatMapper`,
    //  'color: #0000BB')
    let klass = selector.replace(`.`, ``)
    if (rootElem.className.search(new RegExp(`\\b${klass}\\b`)) >= 0) {
      //console.log('%c  Good return. (A)', 'color:#0000BB')
      //console.log(rootElem)
      return Rx.Observable.fromEvent(rootElem, eventName)
    }
    let targetElements = rootElem.querySelectorAll(selector)
    if (targetElements && targetElements.length > 0) {
      //console.log('%c  Good return. (B)', 'color:#0000BB')
      //console.log(targetElements)
      return Rx.Observable.fromEvent(targetElements, eventName)
    }
    //console.log('%c  returning empty!', 'color: #0000BB')
    return Rx.Observable.empty()
  }
}

function makeResponseGetter(rootElem$) {
  return function get(selector, eventName) {
    if (typeof selector !== `string`) {
      throw new Error(`DOM driver's get() expects first argument to be a ` +
        `string as a CSS selector`)
    }
    if (selector.trim() === `:root`) {
      return rootElem$
    }
    if (typeof eventName !== `string`) {
      throw new Error(`DOM driver's get() expects second argument to be a ` +
        `string representing the event type to listen for.`)
    }

    //console.log(`%cget("${selector}", "${eventName}")`, 'color: #0000BB')
    return rootElem$
      .flatMapLatest(makeRootElemToEvent$(selector, eventName))
      .share()
  }
}

function isElement(obj) {
  return typeof HTMLElement === `object` ?
    obj instanceof HTMLElement || obj instanceof DocumentFragment : //DOM2
    obj && typeof obj === `object` && obj !== null &&
    (obj.nodeType === 1 || obj.nodeType === 11) &&
    typeof obj.nodeName === `string`
}

function validateDOMDriverInput(vtree$) {
  if (!vtree$ || typeof vtree$.subscribe !== `function`) {
    throw new Error(`The DOM driver function expects as input an ` +
      `Observable of virtual DOM elements`)
  }
}

function makeDOMDriver(container) {
  // Find and prepare the container
  let domContainer = typeof container === `string` ?
    document.querySelector(container) :
    container
  // Check pre-conditions
  if (typeof container === `string` && domContainer === null) {
    throw new Error(`Cannot render into unknown element \`${container}\``)
  } else if (!isElement(domContainer)) {
    throw new Error(`Given container is not a DOM element neither a selector ` +
      `string.`)
  }

  return function domDriver(vtree$) {
    validateDOMDriverInput(vtree$)
    let rootElem$ = renderRawRootElem$(vtree$, domContainer)
      .startWith(domContainer)
      .replay(null, 1)
    let disposable = rootElem$.connect()
    return {
      get: makeResponseGetter(rootElem$),
      dispose: disposable.dispose.bind(disposable),
    }
  }
}

module.exports = {
  isElement,
  wrapTopLevelVTree,
  makeDiffAndPatchToElement$,
  renderRawRootElem$,
  makeResponseGetter,
  validateDOMDriverInput,

  makeDOMDriver,
}
