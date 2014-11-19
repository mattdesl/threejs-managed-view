var DOMMode = require('./DOMMode'),
	EventUtils = require('browser-event-adder'),
	signals = require('signals'),
	PerformanceTweaker = require('./PerformanceTweaker'),
	Resize = require('input-resize'),
	onResizeSignal = Resize.onResize,
	_ = require('lodash'),
	RenderStats = require('./RenderStats'),
	RenderManager = require('./RenderManager');
/**
 * View is the viewport canvas and the renderer
 * @param {Object} props an object of properties to override default dehaviours
 */
function View(props) {
	this.addCanvasContainerToDOMBody = this.addCanvasContainerToDOMBody.bind(this);
	this.addCanvasToContainer = this.addCanvasToContainer.bind(this);

	props = props || {};
	this.scene = props.scene || new THREE.Scene();
	props.rendererSettings = props.rendererSettings || {};
	if(props.camera) {
		this.camera = props.camera;
	} else {
		this.camera = new THREE.PerspectiveCamera();
		this.scene.add(this.camera);
		this.camera.position.z = 8.50;
		this.camera.position.y = 8.0;
		this.camera.lookAt(this.scene.position);
	}
	this.autoStartRender = props.autoStartRender !== undefined ? props.autoStartRender : true;
	this.canvasContainerID = props.canvasContainerID || "WebGLCanvasContainer";

	this.canvasContainer = props.canvasContainer || this.createCanvasContainer(this.canvasContainerID);
	this.canvasID = props.canvasID || "WebGLCanvas";
	this.domMode = props.domMode || this.canvasContainer ? DOMMode.CONTAINER : DOMMode.FULLSCREEN;
	this.domSize = {x:0, y:0};
	
	//use provided canvas or make your own
	this.canvas = document.getElementById(this.canvasID) || this.createCanvas();
	this.rendererSettings = _.merge({
		canvas: this.canvas,
		antialias: true,
	}, props.rendererSettings);

	if( props.renderer !== undefined) {
		this.renderer = props.renderer;
	} else {
		this.renderer = new THREE.WebGLRenderer(this.rendererSettings);
	}

	if(this.rendererSettings.autoClear === false) this.renderer.autoClear = false;

	this.renderManager = new RenderManager(this);
	if(this.autoStartRender) this.renderManager.start();

	PerformanceTweaker.onChange.add(this.onPerformanceTweakerChangeResolution.bind(this));

	this.setupResizing();

	if(props.stats) {
		this.stats = new RenderStats(this.renderer);
		this.renderManager.onEnterFrame.add(this.stats.onEnterFrame);
		this.renderManager.onExitFrame.add(this.stats.onExitFrame);
	}

}

View.prototype = {
	setupResizing: function() {
		this.setSize = this.setSize.bind(this);
		onResizeSignal.add(this.setSize);
		Resize.bump(this.setSize);
	},
	/**
	 * Renders the scene to the canvas using the renderer
	 * @return {[type]} [description]
	 */
	render: function () {
		PerformanceTweaker.update();
		this.renderer.render(this.scene, this.camera);
	},

	/**
	 * Creates the canvas DOM Element and appends it to the document body
	 * @return {CanvasElement} The newly created canvas element.
	 */
	createCanvasContainer: function() {
		var canvasContainer = document.createElement("div");
		canvasContainer.id = this.canvasContainerID;
		canvasContainer.width = window.innerWidth;
		canvasContainer.height = window.innerHeight;
		this.addCanvasContainerToDOMBody(canvasContainer);
		this.setDOMMode(canvasContainer, this.domMode);
		return canvasContainer;
	},

	createCanvas: function() {
		var canvas = document.createElement("canvas");
		canvas.id = this.canvasID;
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
		this.addCanvasToContainer(canvas);
		this.setDOMMode(canvas, this.domMode);
		return canvas;
	},

	addCanvasContainerToDOMBody: function(canvasContainer) {
		canvasContainer = canvasContainer || this.canvasContainer;
		if(document.body) {
			document.body.appendChild(canvasContainer);
		} else {
			setTimeout(this.addCanvasContainerToDOMBody, 50);
		}
	},

	addCanvasToContainer: function(canvas) {
		canvas = canvas || this.canvas;
		if(this.canvasContainer) {
			this.canvasContainer.appendChild(canvas);
		} else {
			setTimeout(this.addCanvasToContainer, 50);
		}
	},

	/**
	 * sets the DOM Mode, which controls the css rules of the canvas element
	 * @param {String} mode string, enumerated in DOMMode
	 */
	setDOMMode: function(element, mode) {
		var style = element.style;
		switch(mode) {
			case DOMMode.FULLSCREEN:
				style.position = "fixed";
				style.left = "0px";
				style.top = "0px";
				style.width = window.innerWidth + 'px';
				style.height = window.innerHeight + 'px';
				break;
			case DOMMode.CONTAINER:
				style.position = "absolute";
				style.left = "0px";
				style.top = "0px";
				style.width = this.canvasContainer.clientWidth + 'px';
				style.height = this.canvasContainer.clientHeight + 'px';
				break;
			default:
		}
	},

	setSize: function(w, h) {
		if(this.domMode == DOMMode.CONTAINER) {
			w = this.canvasContainer.clientWidth;
			h = this.canvasContainer.clientHeight;
		}
		this.domSize.x = w;
		this.domSize.y = h;
		this.canvas.style.width = w;
		this.canvas.style.height = h;
		this.camera.aspect = w/h;
		this.camera.setLens(w, h);
		this.camera.updateProjectionMatrix();

		this.setResolution(
			~~(w / PerformanceTweaker.denominator), 
			~~(h / PerformanceTweaker.denominator)
		);
	},

	setResolution: function(w, h) {
		this.canvas.width = w;
		this.canvas.height = h;
		this.renderer.setSize(w, h, false);
		this.canvas.style.width = this.domSize.x + 'px';
		this.canvas.style.height = this.domSize.y + 'px';
	},

	onPerformanceTweakerChangeResolution: function(dynamicScale) {
		this.setResolution(
			~~(window.innerWidth * dynamicScale),
			~~(window.innerHeight * dynamicScale)
		);
	}
};

module.exports = View;