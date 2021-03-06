'use strict';

var TestHelper = require('../../../TestHelper');

/* global bootstrapModeler, inject */

var pick = require('lodash/object/pick'),
    assign = require('lodash/object/assign');

var autoResizeModule = require('../../../../lib/features/auto-resize'),
    modelingModule = require('../../../../lib/features/modeling'),
    createModule = require('diagram-js/lib/features/create'),
    coreModule = require('../../../../lib/core');

function getBounds(shape) {
  return pick(shape, ['x', 'y', 'width', 'height']);
}


describe('features/auto-resize', function() {

  var testModules = [coreModule, modelingModule, autoResizeModule, createModule ];


  describe('participant', function() {

    var diagramXML = require('./AutoResize.participant.bpmn');

    var task,
        participant,
        startEvent,
        originalBounds;

    beforeEach(bootstrapModeler(diagramXML, { modules: testModules }));

    beforeEach(inject(function(elementRegistry) {

      task = elementRegistry.get('Task_1');
      participant = elementRegistry.get('Participant_1');
      startEvent = elementRegistry.get('StartEvent_1');

      originalBounds = getBounds(participant);

      expect(originalBounds).to.eql({ x: 247, y: 160, width: 371, height: 178 });

    }));


    describe('after moving', function() {

      it('should expand the right edge',
          inject(function(modeling) {

        // when
        modeling.moveElements([task], { x: 100, y: 0 }, participant);

        // then
        var expectedBounds = assign(originalBounds, { width: 525 });

        expect(participant).to.have.bounds(expectedBounds);

      }));


      it('should expand the top edge', inject(function(modeling) {

        // when
        modeling.moveElements([task], { x: 0, y: -50 }, participant);

        // then
        var expectedBounds = assign(originalBounds, { y: 99, height: 239 });

        expect(participant).to.have.bounds(expectedBounds);

      }));


      it('should expand the bottom edge', inject(function(modeling) {

        // when
        modeling.moveElements([task], { x: 0, y: 50 }, participant);

        // then
        var expectedBounds = assign(originalBounds, { height: 239 });

        expect(participant).to.have.bounds(expectedBounds);

      }));


      it('should expand the left edge', inject(function(modeling) {

        // when
        modeling.moveElements([startEvent], { x: -100, y: 0 }, participant);

        // then
        var expectedBounds = assign(originalBounds, { x: 122, width: 496 });

        expect(participant).to.have.bounds(expectedBounds);

      }));


      it('should expand the bottom right edges', inject(function(modeling) {

        // when
        modeling.moveElements([task], { x: 50, y: 50 }, participant);

        // then
        var expectedBounds = assign(originalBounds, { width: 475, height: 239 });

        expect(participant).to.have.bounds(expectedBounds);

      }));


      it('should expand the top left edges', inject(function(modeling) {

        // when
        modeling.moveElements([startEvent], { x: -100, y: -100 }, participant);

        // then
        expect(participant).to.have.bounds({ x: 122, y: 71, width: 496, height: 267 });

      }));


      it('should not resize the parent if element is placed too far outside',
          inject(function(modeling) {

        // when
        modeling.moveElements([task], { x: 300, y: 0 }, participant);

        // then
        expect(participant).to.have.bounds(originalBounds);

      }));


      it('should resize the parent if element and parent edge intersect',
          inject(function(modeling) {

        // when
        modeling.moveElements([task], { x: 0, y: 49 }, participant);

        // then
        var expectedBounds = assign(originalBounds, { height: 238 });

        expect(participant).to.have.bounds(expectedBounds);

      }));


      it('should not resize the parent if element is placed near the bottom',
          inject(function(modeling) {

        // when
        modeling.moveElements([task], { x: 0, y: 47 }, participant);

        // then
        expect(participant).to.have.bounds(originalBounds);

      }));


      it('should undo resizing', inject(function(modeling, commandStack) {

        // when
        modeling.moveElements([startEvent], { x: -100, y: -100 }, participant);
        commandStack.undo();

        // then
        expect(participant).to.have.bounds(originalBounds);

      }));


      it('should redo resizing', inject(function(modeling, commandStack) {

        // when
        modeling.moveElements([startEvent], { x: -100, y: -100 }, participant);
        commandStack.undo();
        commandStack.redo();

        // then
        expect(participant).to.have.bounds({ x: 122, y: 71, width: 496, height: 267 });

      }));

    });

    describe('after moving multiple elements', function() {

      it('should expand the right edge', inject(function(modeling, selection) {

        // when
        modeling.moveElements([task, startEvent], { x: 200, y: 0 }, participant);

        // then
        var expectedBounds = assign(originalBounds, { width: 625 });

        expect(participant).to.have.bounds(expectedBounds);

      }));


      it('should expand the bottom edge', inject(function(modeling, selection) {

        // when
        modeling.moveElements([task, startEvent], { x: 0, y: 48 }, participant);

        // then
        var expectedBounds = assign(originalBounds, { height: 237 });

        expect(participant).to.have.bounds(expectedBounds);

      }));

    });

    describe('after appending', function(){

      it('should expand the bottom right edges', inject(function(modeling) {

        // when
        modeling.appendShape(task, { type: 'bpmn:Task' }, { x: 660, y: 350 }, participant);

        // then
        var expectedBounds = assign(originalBounds, { width: 563, height: 290 });

        expect(participant).to.have.bounds(expectedBounds);

      }));


      it('should undo resizing', inject(function(modeling, commandStack) {

        // given
        modeling.appendShape(task, { type: 'bpmn:Task' }, { x: 660, y: 250 }, participant);

        // when
        commandStack.undo();

        // then
        expect(participant).to.have.bounds(originalBounds);
      }));


      it('should redo resizing and restore shapes and connections',
        inject(function(modeling, commandStack) {

        // given
        var task2 = modeling.appendShape(task, { type: 'bpmn:Task' }, { x: 660, y: 250 }, participant);

        // when
        commandStack.undo();
        commandStack.redo();

        // then
        var expectedBounds = assign(originalBounds, { width: 563 });

        expect(participant).to.have.bounds(expectedBounds);

        expect(task2).to.be.defined;
        expect(task.outgoing).not.to.be.empty;
        expect(task2.incoming).not.to.be.empty;

      }));

    });


    it('should not auto-resize when adding lane', inject(function(modeling) {

      // given
      var laneAttrs = {
        type: 'bpmn:Lane',
        width: 341,
        height: 178
      };

      // when
      modeling.createShape(laneAttrs, { x: 280, y: 200 }, participant);

      // then
      expect(participant).to.have.bounds(originalBounds);
    }));

  });


  describe('lane', function() {

    var diagramXML = require('./AutoResize.lanes.bpmn');

    beforeEach(bootstrapModeler(diagramXML, { modules: testModules }));


    it('should auto-resize to fit new element', inject(function(elementRegistry, modeling) {

      // given
      var laneShape = elementRegistry.get('Lane_Nested');

      // when
      modeling.createShape({ type: 'bpmn:Task' }, { x: 600, y: 320 }, laneShape);

      // then
      expect(laneShape).to.have.bounds({ x: 307, y: 160, width: 443, height: 260});
    }));


    it('should auto-resize to fit multiple moved elements', inject(function(elementRegistry, modeling) {

      // given
      var laneShape = elementRegistry.get('Lane_Nested'),
          taskShape = elementRegistry.get('Task_1'),
          startEventShape = elementRegistry.get('StartEvent_1');

      var originalBounds = getBounds(laneShape);

      // when
      modeling.moveElements([taskShape, startEventShape], { x: 200, y: 0 }, laneShape);

      // then
      var expectedBounds = assign(originalBounds, { width: 565 });

      expect(laneShape).to.have.bounds(expectedBounds);
    }));

  });

});
