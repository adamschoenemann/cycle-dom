'use strict';
/* global describe, it, beforeEach */
let assert = require('assert');
let Cycle = require('@cycle/core');
let CycleDOM = require('../../src/cycle-dom');
let {Rx} = Cycle;
let {h, makeHTMLDriver} = CycleDOM;

describe('renderAsHTML()', function () {
  it('should output HTML when given a simple vtree stream', function (done) {
    function app() {
      return {
        html: Rx.Observable.just(h('div.test-element', ['Foobar']))
      };
    }
    let [requests, responses] = Cycle.run(app, {
      html: makeHTMLDriver()
    });
    responses.html.subscribe(html => {
      assert.strictEqual(html, '<div class="test-element">Foobar</div>');
      done();
    });
  });

  it('should output simple HTML Observable at `.get(\':root\')`', function (done) {
    function app() {
      return {
        html: Rx.Observable.just(h('div.test-element', ['Foobar']))
      };
    }
    let [requests, responses] = Cycle.run(app, {
      html: makeHTMLDriver()
    });
    responses.html.get(':root').subscribe(html => {
      assert.strictEqual(html, '<div class="test-element">Foobar</div>');
      done();
    });
  });

  it('should render a simple nested vtree$ as HTML', function (done) {
    function app() {
      return {
        DOM: Rx.Observable.just(h('div.test-element', [
          Rx.Observable.just(h('h3.myelementclass'))
        ]))
      };
    }
    let [requests, responses] = Cycle.run(app, {
      DOM: makeHTMLDriver()
    });
    responses.DOM.subscribe(html => {
      assert.strictEqual(html,
        '<div class="test-element">' +
          '<h3 class="myelementclass"></h3>' +
        '</div>'
      );
      done();
    });
  });

  it('should render double nested vtree$ as HTML', function (done) {
    function app() {
      return {
        html: Rx.Observable.just(h('div.test-element', [
          Rx.Observable.just(h('div.a-nice-element', [
            String('foobar'),
            Rx.Observable.just(h('h3.myelementclass'))
          ]))
        ]))
      };
    }
    let html$ = Cycle.run(app, {html: makeHTMLDriver()})[1].html;
    html$.subscribe(html => {
      assert.strictEqual(html,
        '<div class="test-element">' +
          '<div class="a-nice-element">' +
            'foobar<h3 class="myelementclass"></h3>' +
          '</div>' +
        '</div>'
      );
      done();
    });
  });

  it('should HTML-render a nested vtree$ with props', function (done) {
    function myElement(foobar$) {
      return foobar$.map(foobar =>
        h('h3.myelementclass', String(foobar).toUpperCase())
      );
    }
    function app() {
      return {
        DOM: Rx.Observable.just(
          h('div.test-element', [
            myElement(Rx.Observable.just('yes'))
          ])
        )
      };
    }
    let [requests, responses] = Cycle.run(app, {
      DOM: makeHTMLDriver()
    });

    responses.DOM.subscribe(html => {
      assert.strictEqual(html,
        '<div class="test-element">' +
          '<h3 class="myelementclass">YES</h3>' +
        '</div>'
      );
      done();
    });
  });

  it('should render a complex and nested vtree$ as HTML', function (done) {
    function app() {
      return {
        html: Rx.Observable.just(
          h('.test-element', [
            h('div', [
              h('h2.a', 'a'),
              h('h4.b', 'b'),
              Rx.Observable.just(h('h1.fooclass'))
            ]),
            h('div', [
              h('h3.c', 'c'),
              h('div', [
                h('p.d', 'd'),
                Rx.Observable.just(h('h2.barclass'))
              ])
            ])
          ])
        )
      };
    }
    let [requests, responses] = Cycle.run(app, {
      html: makeHTMLDriver()
    });

    responses.html.subscribe(html => {
      assert.strictEqual(html,
        '<div class="test-element">' +
          '<div>' +
            '<h2 class="a">a</h2>' +
            '<h4 class="b">b</h4>' +
            '<h1 class="fooclass"></h1>' +
          '</div>' +
          '<div>' +
            '<h3 class="c">c</h3>' +
            '<div>' +
              '<p class="d">d</p>' +
              '<h2 class="barclass"></h2>' +
            '</div>' +
          '</div>' +
        '</div>'
      );
      done();
    });
  });
});
